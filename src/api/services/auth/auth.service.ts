import { Injectable } from '@decorators/di';


import { User } from '../../models/mongoose';


import { compare, hash } from 'bcryptjs';
import { authConfig } from '../../config';

import { randomBytes } from 'crypto';
import { Logger } from '../../config/logger/WinstonLogger';

import { PasswordUtil } from '../../utils';
import { AuthResponse, ICustomRequest, RegisterDTO } from '../../interfaces';
import { DatabaseHelper } from '../../utils/database.helper';
import Settings from '../../models/mongoose/setting/setting';
import { v4 as uuidv4 } from 'uuid';
import { referred } from '../../models/mongoose';
import { EmailService } from '../email/email.service';
import { TokenService } from './token.service';
import { PluginService } from '../plugin/plugin.service';
import { SettingsService } from '../setting/settings.service';
import { RequestHelper } from '../../utils/request.helper';
import { ForgotPassword, IForgotPasswordDocument } from '../../models/mongoose/forgotPassword.model';
import { ApiResponse } from '../../responses';
import { lookup } from 'geoip-lite';
import moment from 'moment';
import { gameFormats } from '../../seeds/gameFormats.seed';
import GameFormat from '../../models/mongoose/championship/gameFormat';
import { CustomError } from '../../errors';



interface TokenResponse {
    token: string;
    settings?: any;
    plugins?: any[];
    parentAccount?: string;
}


@Injectable()
export class AuthService {
    private readonly tokenService: TokenService;
    private readonly settingsService: SettingsService;
    private readonly pluginService: PluginService;
    private readonly MAX_LOGIN_ATTEMPTS = authConfig.MAX_LOGIN_ATTEMPTS;
    private readonly BLOCK_TIME = authConfig.BLOCK_TIME;
    private readonly logger: Logger;
    private readonly emailService: EmailService;


    constructor() {
        this.tokenService = new TokenService();
        this.settingsService = new SettingsService();
        this.pluginService = new PluginService();
        this.logger = new Logger();
        this.emailService = new EmailService();

    }

    public async registerUser(data: RegisterDTO): Promise<AuthResponse> {
        const { tenant, email, name, password, userReferred } = data;

        // Verificar tenant existente
        const existingTenant = await DatabaseHelper.exists(Settings, tenant, {});

        if (existingTenant) {
            throw new CustomError('Tenant already exists', 422, 'AuthServiceError');
        }
        // Verificar email existente
        const existingUser = await DatabaseHelper.exists(User, tenant, { email: email.toLowerCase() });

        if (existingUser) {
            throw new CustomError('Email already registered', 422, 'AuthServiceError');
        }
        // Encriptar la contraseña usando PasswordUtil
        const hashedPassword = await PasswordUtil.hashPassword(password);
        // Crear usuario con código de verificación
        const verificationCode = uuidv4();
        const user = await DatabaseHelper.create(User, tenant, {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            verification: verificationCode,
            verified: false
        });
        await this.emailService.sendVerificationEmail({
            email: user.email,
            name: user.name,
            verificationCode: verificationCode,
            tenant,
            locale: data.locale || 'es'
        });
        // Crear settings
        await this.settingsService.createSettings({
            name,
            tenant,
            ownerId: user._id.toString()
        });

        await this.pluginService.activePlugins(['excelImport', 'pdfReport', 'liveResults', 'socialSharing'], tenant)
        // Generar token y respuesta

        const userInfo = this.formatUserResponse(user);
        const token = this.tokenService.generateToken(user._id.toString(), tenant);
        await this.registerUserReferred(userReferred as string, user, tenant)
        const settings = await this.settingsService.getSettings(tenant);

        return {
            session: `Bearer ${token}`,
            user: userInfo,
            settings
        };
    }

    // public methods
    public async registerUserReferred(codeRef: string, userTo: any, tenant: string): Promise<void> {
        if (!codeRef) return;

        try {
            const referredUser = await DatabaseHelper.findOne(User, tenant, { referredCode: codeRef });
            if (!referredUser) {
                throw new CustomError('Referred user not found', 404, 'AuthServiceError');
            }

            const body = {
                userTo: userTo._id,
                userFrom: referredUser._id,
                amountFrom: 1,
                amountTo: 1
            };

            await DatabaseHelper.create(referred, tenant, body);
        } catch (error) {
            throw new CustomError('Error registering referred user', 500, 'AuthServiceError');
        }
    };

    public async verifyUser(tenant: string, verificationId: string): Promise<any> {
        try {

            this.logger.info('Verifying user:', {
                tenant
            });

            // Buscar usuario con el código de verificación
            const user = await DatabaseHelper.findOne(
                User,
                tenant,
                {
                    verification: verificationId,
                    verified: false
                },
                {
                    select: ['_id', 'email', 'verification', 'verified'],
                    throwError: true,
                    errorMessage: 'Invalid verification code'
                }
            );
            if (!user) {
                throw new CustomError('User not found', 404, 'AuthServiceError');
            }
            // Actualizar usuario como verificado
            const updatedUser = await DatabaseHelper.update(
                User,
                user._id.toString(),
                tenant,
                {
                    verified: true,
                    verification: ''  // o undefined
                },
                {
                    throwError: true,
                    errorMessage: 'Error updating user verification status'
                }
            );

            this.logger.info('User verified successfully:', {
                tenant,
                userId: updatedUser?._id
            });

            return {
                verified: true,
                message: 'User successfully verified'
            };
        } catch (error) {
            this.logger.error('Verification error:', {
                error: error instanceof Error ? { name: error.name, message: error.message } : error,
                tenant
            });
            throw new CustomError(
                error instanceof CustomError ? error.message : 'Error verifying user',
                error instanceof CustomError ? error.statusCode : 500,
                'AuthServiceError'
            );
        }
    }

    public async refreshToken(req: ICustomRequest): Promise<TokenResponse> {
        const tenant = req.clientAccount;
        const refreshToken = req.headers.authorization?.replace('Bearer ', '').trim();

        if (!refreshToken) {
            throw new CustomError('Refresh token not provided', 401, 'AuthServiceError');
        }
        if (!tenant) {
            throw new CustomError('Tenant not provided', 401, 'AuthServiceError');
        }

        // Verificar refresh token
        const decoded = this.tokenService.getPayloadFromRefreshToken(refreshToken);

        // Validar que el tenant del token coincida con el tenant de la petición
        if (decoded.tenant !== tenant) {
            throw new CustomError('Token not valid for this tenant domain', 401, 'AuthServiceError');
        }

        // Buscar usuario
        const user = await User.byTenant(tenant).findById(decoded.userId);

        if (!user) {
            throw new CustomError('User not found', 404, 'AuthServiceError');
        }

        // Generar nuevos tokens
        const tokens = this.tokenService.generateToken(user._id.toString(), tenant);

        return {
            token: tokens,
            settings: await this.settingsService.getSettings(tenant),
            plugins: await this.pluginService.getPlugins(tenant),
            ...(req.parentAccount && { parentAccount: req.parentAccount })
        };
    }

    public async forgotPassword(email: string, tenant: string, locale: string, req: any): Promise<{ message: string }> {
        try {
            // 1. Buscar usuario
            const user = await DatabaseHelper.findOne(User, tenant, {
                email: email.toLowerCase()
            });

            if (!user) {
                throw new CustomError('User not found', 404, 'AuthServiceError');
            }

            // 2. Verificar si ya existe un token válido
            const existingToken = await DatabaseHelper.findOne(
                ForgotPassword,
                tenant,
                {
                    email: user.email.toLowerCase(),
                    used: false,
                }
            );

            if (existingToken) {
                // Opcional: actualizar fecha de expiración del token existente
                await DatabaseHelper.update(
                    ForgotPassword,
                    existingToken._id.toString(),
                    tenant,
                    { expiresAt: new Date(Date.now() + 3600000) }
                );

                // Reenviar email con el token existente
                await this.emailService.sendResetPasswordEmail(
                    locale,
                    {
                        email: user.email,
                        name: user.name,
                        token: existingToken.urlId
                    },
                    tenant
                );

                return {
                    message: 'Recovery email resent'
                };
            }

            // 3. Si no existe token válido, crear uno nuevo


            // 4. Crear nuevo registro en ForgotPassword
            const forgotPasswordRecord = await this.saveForgotPassword(user.email, tenant, req);

            // 6. Enviar email
            await this.emailService.sendResetPasswordEmail(
                locale,
                {
                    email: user.email,
                    name: user.name,
                    token: forgotPasswordRecord.urlId
                },
                tenant
            );

            return {
                message: 'Email recovery sent'
            };
        } catch (error) {
            this.logger.error('Error in forgot password:', error instanceof Error ? { name: error.name, message: error.message } : error);
            throw new CustomError(
                error instanceof CustomError ? error.message : 'Error in forgot password process',
                error instanceof CustomError ? error.statusCode : 500,
                'AuthServiceError'
            );
        }
    }

    public async loginUser(data: { email: string; password: string; tenant: string }): Promise<AuthResponse> {
        const user = await DatabaseHelper.findOne(User, data.tenant, { email: data.email.toLowerCase() }, {
            select: ['+password'],
            throwError: false,
            errorMessage: 'User not found'
        });
        if (!user) {
            throw new CustomError('Invalid credentials', 401, 'AuthServiceError');
        }

        // Verificar si el usuario está verificado
        if (!user.verified) {
            // Opcionalmente, podemos reenviar el email de verificación aquí
            const verificationCode = uuidv4();
            user.verification = verificationCode;
            await user.save();

            await this.emailService.sendVerificationEmail({
                email: user.email,
                name: user.name,
                verificationCode: verificationCode,
                tenant: data.tenant
            });

            throw new CustomError('Please verify your email before logging in. A new verification email has been sent.', 403, 'AuthServiceError');
        }

        // Verificar si el usuario está bloqueado
        await this.checkLoginAttemptsAndBlockExpires(user);
        // Verificar contraseña
        const isPasswordMatch = await PasswordUtil.comparePassword(data.password, user.password);
        if (!isPasswordMatch) {
            await this.passwordsDoNotMatch(user);
            throw new CustomError('Invalid credentials', 401, 'AuthServiceError');
        }
        // Reset intentos de login y generar token
        user.loginAttempts = 0;
        user.blockExpires = new Date(0);
        await user.save();

        const token = this.tokenService.generateToken(user._id.toString(), data.tenant);
        const userInfo = this.formatUserResponse(user);
        const settings = await this.settingsService.getSettings(data.tenant);

        return {
            session: `Bearer ${token}`,
            user: userInfo,
            settings
        };
    }

    public async resetPassword(urlId: string, newPassword: string, tenant: string): Promise<{ message: string }> {
        try {

            const forgotPasswordRecord = await DatabaseHelper.findOne(
                ForgotPassword,
                tenant,
                {
                    urlId: urlId,
                    used: false,
                    expiresAt: { $gt: new Date() }
                }
            );
            if (!forgotPasswordRecord) {
                throw new CustomError('Invalid or expired reset token', 400, 'AuthServiceError');
            }
            const now = new Date();
            if (now > forgotPasswordRecord.expiresAt) {
                this.logger.error('Reset token expired');
                throw new CustomError('Reset token expired', 400, 'AuthServiceError');
            }
            const user = await DatabaseHelper.findOne(User, tenant, {
                email: forgotPasswordRecord.email
            });

            if (!user) {
                throw new CustomError('Invalid or expired reset token', 400, 'AuthServiceError');
            }
            // Usar PasswordUtil para hashear
            const hashedPassword = await PasswordUtil.hashPassword(newPassword);

            user.password = hashedPassword;

            await user.save({ validateBeforeSave: false });

            forgotPasswordRecord.used = true;
            await forgotPasswordRecord.save();

            return { message: 'Password updated successfully' };
        } catch (error) {
            this.logger.error('Error in reset password:', error instanceof Error ? { name: error.name, message: error.message } : error);
            throw new CustomError(
                error instanceof CustomError ? error.message : 'Error in reset password',
                error instanceof CustomError ? error.statusCode : 500,
                'AuthServiceError'
            );
        }
    }

    public async saveForgotPassword(email: string, tenant: string, req: any): Promise<IForgotPasswordDocument> {
        try {
            this.logger.info('Attempting to save forgot password:', { email, tenant });

            const ip = req.ip || 'N/A';
            const userAgent = req.headers['user-agent'] || 'Unknown Browser';
            const geo = lookup(ip);
            const country = geo?.country || 'Unknown Country';

            const urlId = uuidv4();

            const resetTokenExpiry = new Date(Date.now() + 3600000);
            const forgotPasswordData = {
                email: email,
                ipRequest: ip,
                urlId: urlId,
                browserRequest: userAgent,
                countryRequest: country,
                used: false,
                expiresAt: resetTokenExpiry,
            };

            const forgotPassword = await DatabaseHelper.create(
                ForgotPassword,
                tenant,
                forgotPasswordData
            );

            this.logger.info('Forgot password record created:', { id: forgotPassword._id });
            return forgotPassword;
        } catch (error) {
            this.logger.error('Error saving forgot password:', error instanceof Error ? { name: error.name, message: error.message } : error);
            throw new CustomError(
                error instanceof CustomError ? error.message : 'Error saving forgot password request',
                error instanceof CustomError ? error.statusCode : 422,
                'AuthServiceError'
            );
        }
    }

    // private methods
    private async checkLoginAttemptsAndBlockExpires(user: any) {


        if (user.blockExpires > Date.now()) {
            throw new CustomError('User temporarily blocked', 409, 'AuthServiceError');
        }

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.blockExpires = new Date(Date.now() + this.BLOCK_TIME);
            await user.save();
            throw new CustomError('User temporarily blocked', 409, 'AuthServiceError');
        }
    }

    private async passwordsDoNotMatch(user: any) {
        // Asegúrate de que loginAttempts sea un número
        if (typeof user.loginAttempts !== 'number') {
            user.loginAttempts = 0;
        }
        user.loginAttempts += 1;
        await user.save();

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.blockExpires = new Date(Date.now() + this.BLOCK_TIME);
            await user.save();
            throw new CustomError('User temporarily blocked', 409, 'AuthServiceError');
        }
    }
    private formatUserResponse(user: any) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            verified: user.verified,
        };
    }


} 