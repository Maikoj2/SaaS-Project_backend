import { Injectable } from '@decorators/di';
import { AuthError } from '../errors/AuthError';

import { User } from '../models/mongoose';
import { AuthResponse, CustomRequest, RegisterDTO } from '../interfaces';
import { TokenService } from './token.service';
import { SettingsService } from './settings.service';
import { compare, genSalt, hash } from 'bcryptjs';
import { authConfig } from '../config';
import { PluginService } from './plugin.service';
import { randomBytes } from 'crypto';
import { Logger } from '../config/logger/WinstonLogger';
import { EmailService } from './email.service';
import { PasswordUtil } from '../utils';
import { UserHelper } from '../utils/user.helper';


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
        const { tenant, email, name, password } = data;

        // Validar datos requeridos
        if (!email || !name || !password || !tenant) {
            throw new AuthError('All fields are required', 400);
        }

        // Verificar tenant existente
        const existingTenant = await this.settingsService.findByTenant(tenant);


        if (existingTenant) {
            throw new AuthError('Tenant already exists', 422);
        }

        // Verificar email existente
        const existingUser = await UserHelper.findUserByEmail(User, email, tenant, {})
        console.log('existingUser', existingUser);
        if (existingUser) {
            throw new AuthError('Email already registered', 422);
        }

        // Crear usuario
        const user = await this.createUser({
            name,
            email,
            password,
            tenant,
            role: 'admin'
        });

        // Crear settings
        await this.settingsService.createSettings({
            name,
            tenant,
            ownerId: user._id.toString()
        });

        // Generar token y respuesta
        const token = this.tokenService.generateToken(user._id.toString());
        const userInfo = this.formatUserResponse(user);
        const settings = await this.settingsService.getSettings(tenant);

        return {
            session: token,
            user: userInfo,
            settings
        };
    }

    // public methods
    public async verifyUser(tenant: string, verificationId: string): Promise<any> {
        const user = await User.byTenant(tenant)
            .findOne({ verification: verificationId });

        if (!user) {
            throw new AuthError('Invalid verification code', 404);
        }

        user.verified = true;
        user.verification = undefined;
        await user.save();

        return {
            verified: true
        };
    }

    public async refreshToken(req: CustomRequest): Promise<TokenResponse> {
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
            // Buscar usuario
            const user = await User.byTenant(tenant)
                .findOne({ email });

            if (!user) {
                throw new AuthError('User not found', 404);
            }

            // Generar token y fecha de expiración
            const resetToken = randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

            // Guardar token encriptado
            user.resetPasswordToken = await hash(resetToken, 10);
            user.resetPasswordExpires = resetTokenExpiry;
            await user.save();

            // Enviar email
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
            throw error;
        }
    }

    public async loginUser(data: { email: string; password: string; tenant: string }): Promise<AuthResponse> {


        const user = await UserHelper.findUserByEmail(User, data.email, data.tenant, {
            select: ['+password'],
            throwError: false,
            errorMessage: 'Invalid credentials'
        });
        if (!user) {
            throw new AuthError('Invalid credentials', 401);
        }

        // Verificar si el usuario está bloqueado
        await this.checkLoginAttemptsAndBlockExpires(user);

        // 2. Loggear información
        this.logger.info('Login attempt:', {
            email: data.email,
            storedHash: user.password.substring(0, 10) + '...',
            passwordAttempt: data.password
        });
        // Verificar contraseña
        const isPasswordMatch = await this.checkPassword(data.password, user);

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
            const user = await User.byTenant(tenant)
                .findOne({
                    resetPasswordToken: { $exists: true },
                    resetPasswordExpires: { $gt: new Date() }
                });

            if (!user) {
                throw new AuthError('Token inválido o expirado', 400);
            }

            // Usar PasswordUtil para hashear
            const hashedPassword = await PasswordUtil.hashPassword(newPassword);

            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            await user.save({ validateBeforeSave: false });

            this.logger.info('Contraseña reseteada:', {
                userId: user._id,
                hashedPassword: hashedPassword.substring(0, 10) + '...'
            });

            return { message: 'Contraseña actualizada exitosamente' };
        } catch (error) {
            this.logger.error('Error en reset password:', error);
            throw error;
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

    public async checkPassword(password: string, user: any): Promise<boolean> {
        console.log(password, user);
        return await compare(password, user.password);
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

    private async createUser(userData: any) {
        const model = User.byTenant(userData.tenant);
        const user = new model(userData);
        return await user.save();
    }

    private formatUserResponse(user: any) {
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            verified: user.verified,
            // ... other necessary fields
        };
    }

    private async findUserByEmail(email: string, tenant: string) {
        if (!email) {
            throw new AuthError('Email is required', 400);
        }

        return await User.byTenant(tenant)
            .findOne({ email: email.toLowerCase() });
    }
} 