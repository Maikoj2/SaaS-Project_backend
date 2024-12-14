import { Injectable } from '@decorators/di';
import { AuthError } from '../../errors/AuthError';

import { User } from '../../models/mongoose';


import { compare, hash } from 'bcryptjs';
import { authConfig } from '../../config';

import { randomBytes } from 'crypto';
import { Logger } from '../../config/logger/WinstonLogger';

import { PasswordUtil } from '../../utils';
import { AuthResponse, IUserCustomRequest, RegisterDTO } from '../../interfaces';
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
            throw new AuthError('Tenant already exists', 422);
        }
        // Verificar email existente
        const existingUser = await DatabaseHelper.exists(User, tenant, { email: email.toLowerCase() });

        if (existingUser) {
            throw new AuthError('Email already registered', 422);
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
        const token = this.tokenService.generateToken(user._id.toString());
        await this.registerUserReferred(userReferred as string, user, tenant)
        const settings = await this.settingsService.getSettings(tenant);

        return {
            session: token,
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
                throw new AuthError('Referred user not found', 404);
            }

            const body = {
                userTo: userTo._id,
                userFrom: referredUser._id,
                amountFrom: 1,
                amountTo: 1
            };

            await DatabaseHelper.create(referred, tenant, body);
        } catch (error) {
            throw new AuthError('Error registering referred user', 500);
        }
    };

    public async verifyUser(tenant: string, verificationId: string): Promise<any> {
        try {

            this.logger.info('Verifying user:', {
                tenant,
                verificationId
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
                    errorMessage: 'Código de verificación inválido'
                }
            );
            if (!user) {
                throw new AuthError('User not found', 404);
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

            console.log('User verified successfully:', updatedUser);

            return {
                verified: true,
                message: 'User successfully verified'
            };
        } catch (error) {
            console.error('Verification error:', error);
            throw new AuthError(
                error instanceof AuthError ? error.message : 'Error verifying user',
                error instanceof AuthError ? error.statusCode : 500
            );
        }
    }

    public async refreshToken(req: IUserCustomRequest): Promise<TokenResponse> {
        const tenant = req.clientAccount;
        const refreshToken = req.headers.authorization?.replace('Bearer ', '').trim();

        if (!refreshToken) {
            throw new AuthError('Refresh token not provided', 401);
        }
        if (!tenant) {
            throw new AuthError('Tenant not provided', 401);
        }

        // Verificar refresh token
        const decoded = this.tokenService.getUserIdFromToken(refreshToken);

        // Buscar usuario
        const user = await User.byTenant(tenant).findById(decoded);

        if (!user) {
            throw new AuthError('User not found', 404);
        }

        // Generar nuevos tokens
        const tokens = this.tokenService.generateToken(user._id.toString());

        return {
            token: tokens,
            settings: await this.settingsService.getSettings(tenant),
            plugins: await this.pluginService.getPlugins(tenant),
            ...(req.parentAccount && { parentAccount: req.parentAccount })
        };
    }

    public async forgotPassword(email: string, tenant: string, locale: string): Promise<{ message: string }> {
        try {
            // 1. Buscar usuario
            const user = await DatabaseHelper.findOne(User, tenant, { 
                email: email.toLowerCase() 
            });

            if (!user) {
                throw new AuthError('User not found', 404);
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
                        token: existingToken.verification
                    },
                    tenant
                );

                return {
                    message: 'Recovery email resent'
                };
            }

            // 3. Si no existe token válido, crear uno nuevo
            const resetToken = randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000);

            // 4. Crear nuevo registro en ForgotPassword
            await DatabaseHelper.create(
                ForgotPassword,
                tenant,
                {
                    email: user.email.toLowerCase(),
                    verification: resetToken,
                    type: 'PASSWORD_RESET',
                    used: false,
                    ipRequest: 'SYSTEM',
                    browserRequest: 'SYSTEM',
                    countryRequest: 'SYSTEM',
                    expiresAt: resetTokenExpiry
                }
            );

            // 5. Actualizar usuario
            await DatabaseHelper.update(
                User,
                user._id.toString(),
                tenant,
                {
                    resetPasswordToken: await hash(resetToken, 10),
                    resetPasswordExpires: resetTokenExpiry
                }
            );

            // 6. Enviar email
            await this.emailService.sendResetPasswordEmail(
                locale,
                {
                    email: user.email,
                    name: user.name,
                    token: resetToken
                },
                tenant
            );

            return {
                message: 'Email recovery sent'
            };
        } catch (error) {
            this.logger.error('Error in forgot password:', error);
            throw new AuthError('Error in forgot password process', 500);
        }
    }

    public async loginUser(data: { email: string; password: string; tenant: string }): Promise<AuthResponse> {
        const user = await DatabaseHelper.findOne(User, data.tenant, { email: data.email.toLowerCase() }, {
            select: ['+password'],
            throwError: false,
            errorMessage: 'Usuario no encontrado'
        });
        if (!user) {
            throw new AuthError('Invalid credentials', 401);
        }
        // Verificar si el usuario está bloqueado
        await this.checkLoginAttemptsAndBlockExpires(user);
        // Verificar contraseña
        const isPasswordMatch = await PasswordUtil.comparePassword(data.password, user.password);
        this.logger.info('Resultado de comparación:', {
            isPasswordMatch,
            passwordLength: data.password.length,
            hashLength: user.password.length
        });
        if (!isPasswordMatch) {
            await this.passwordsDoNotMatch(user);
            throw new AuthError('Invalid credentials', 401);
        }
        // Reset intentos de login y generar token
        user.loginAttempts = 0;
        user.blockExpires = new Date(0);
        await user.save();

        const token = this.tokenService.generateToken(user._id.toString());
        const userInfo = this.formatUserResponse(user);
        const settings = await this.settingsService.getSettings(data.tenant);

        return {
            session: token,
            user: userInfo,
            settings
        };
    }

    public async resetPassword(token: string, newPassword: string, tenant: string): Promise<{ message: string }> {
        try {
            const userId = this.tokenService.verifyResetToken(token);

            const user = await User.byTenant(tenant)
                .findOne({
                    _id: userId,
                    resetPasswordToken: { $exists: true },
                    resetPasswordExpires: { $gt: new Date() }
                });

            if (!user) {
                throw new AuthError('Token inválido o expirado', 400);
            }
            // 3. Buscar y actualizar registro en ForgotPassword
            const forgotPasswordRecord = await DatabaseHelper.findOneAndUpdate(
                ForgotPassword,
                tenant,
                {
                    verification: token,
                    used: false,
                    email: user.email
                },
                {
                    used: true,
                    usedAt: new Date()
                }
            );
            if (!forgotPasswordRecord) {
                throw new AuthError('Token of reset password not found or already used', 400);
            }
            // Usar PasswordUtil para hashear
            const hashedPassword = await PasswordUtil.hashPassword(newPassword);

            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save({ validateBeforeSave: false });

            return { message: 'Password updated successfully' };
        } catch (error) {
            this.logger.error('Error in reset password:', error);
            throw error;
        }
    }

    public async saveForgotPassword(email: string, tenant: string): Promise<IForgotPasswordDocument> {
        try {
            this.logger.info('Attempting to save forgot password:', { email, tenant });
            const forgotPasswordData = {
                email: email,
                verification: uuidv4(),
                ipRequest: 'N/A', // O implementar lógica para obtener IP
                browserRequest: 'N/A', // O implementar lógica para obtener browser
                countryRequest: 'N/A',// O implementar lógica para obtener país
                used: false
            };
            this.logger.info('Creating forgot password record:', forgotPasswordData);
            const forgotPassword = await DatabaseHelper.create(
                ForgotPassword,
                tenant,
                forgotPasswordData
            );
            this.logger.info('Forgot password record created:', { id: forgotPassword._id });

            return forgotPassword;
        } catch (error) {
            this.logger.error('Error saving forgot password:', error);
            throw new AuthError('Error saving forgot password request', 422);
        }
    }

    // private methods
    private async checkLoginAttemptsAndBlockExpires(user: any) {


        if (user.blockExpires > Date.now()) {
            throw new AuthError('User temporarily blocked', 409);
        }

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.blockExpires = new Date(Date.now() + this.BLOCK_TIME);
            await user.save();
            throw new AuthError('User temporarily blocked', 409);
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
            throw new AuthError('User temporarily blocked', 409);
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