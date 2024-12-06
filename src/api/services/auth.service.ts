import { Injectable } from '@decorators/di';
import { AuthError } from '../errors/AuthError';

import { User } from '../models/mongoose';
import { AuthResponse, CustomRequest, RegisterDTO } from '../interfaces';
import { TokenService } from './token.service';
import { SettingsService } from './settings.service';
import bcrypt from 'bcryptjs';
import { authConfig } from '../config';
import { PluginService } from './plugin.service';

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


    constructor() {
        this.tokenService = new TokenService();
        this.settingsService = new SettingsService();
        this.pluginService = new PluginService();

    }

    public async registerUser(data: RegisterDTO): Promise<AuthResponse> {
        const { tenant, email, name, password } = data;

        // Validar datos requeridos
        if (!email || !name || !password || !tenant) {
            throw new AuthError('Todos los campos son requeridos', 400);
        }

        // Verificar tenant existente
        const existingTenant = await this.settingsService.findByTenant(tenant);
        if (existingTenant) {
            throw new AuthError('Tenant ya existe', 422);
        }

        // Verificar email existente
        const existingUser = await this.findUserByEmail(email, tenant);
        if (existingUser) {
            throw new AuthError('Email ya registrado', 422);
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

    public async verifyUser(tenant: string, verificationId: string): Promise<any> {
        const user = await User.byTenant(tenant)
            .findOne({ verification: verificationId });

        if (!user) {
            throw new AuthError('Código de verificación inválido', 404);
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
        const tokenEncrypted = req.headers.authorization?.replace('Bearer ', '').trim();
        if (!tokenEncrypted) {
            throw new AuthError('Token no proporcionado', 401);
        }
        if (!tenant) {
            throw new AuthError('tenant no proporcionado', 401);
        }
        // Verificar y decodificar token
        const userId = await this.tokenService.getUserIdFromToken(tokenEncrypted);
        
        // Buscar usuario
        const user = await User.byTenant(tenant).findById(userId);
        
        if (!user) {
            throw new AuthError('Usuario no encontrado', 404);
        }
        // Generar nuevo token
        const tokenData = this.tokenService.generateToken(user._id.toString());
        
        // Agregar datos adicionales
        return {
            token: tokenData,
            settings: await this.settingsService.getSettings(tenant),
            plugins: await this.pluginService.getPlugins(tenant),
            ...(req.parentAccount && { parentAccount: req.parentAccount })
        };
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
            // ... otros campos necesarios
        };
    }

    private async findUserByEmail(email: string, tenant: string) {
        if (!email) {
            throw new AuthError('Email es requerido', 400);
        }

        return await User.byTenant(tenant)
            .findOne({ email: email.toLowerCase() });
    }

    public async loginUser(data: { email: string; password: string; tenant: string }): Promise<AuthResponse> {
        const user = await this.findUser(data.email, data.tenant);

        // Verificar si el usuario está bloqueado
        await this.checkLoginAttemptsAndBlockExpires(user);

        // Verificar contraseña
        const isPasswordMatch = await this.checkPassword(data.password, user);

        if (!isPasswordMatch) {
            await this.passwordsDoNotMatch(user);
            throw new AuthError('Credenciales inválidas', 401);
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

    private async findUser(email: string, tenant: string) {
        const user = await User.byTenant(tenant).findOne({ email: email.toLowerCase() }).select('+password').select([
            'name',
            'email',
            'role',
            'verified',
            'loginAttempts',
            'blockExpires',
            'createdAt',
            'updatedAt'
        ]);
        if (!user) {
            throw new AuthError('Credenciales inválidas', 401);
        }
        return user;
    }

    private async checkLoginAttemptsAndBlockExpires(user: any) {


        if (user.blockExpires > Date.now()) {
            throw new AuthError('Usuario bloqueado temporalmente', 409);
        }

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.blockExpires = new Date(Date.now() + this.BLOCK_TIME);
            await user.save();
            throw new AuthError('Usuario bloqueado temporalmente', 409);
        }
    }

    private async checkPassword(password: string, user: any): Promise<boolean> {
        return await bcrypt.compare(password, user.password);
    }

    private async passwordsDoNotMatch(user: any) {
        user.loginAttempts += 1;
        await user.save();

        if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
            user.blockExpires = new Date(Date.now() + this.BLOCK_TIME);
            await user.save();
            throw new AuthError('Usuario bloqueado temporalmente', 409);
        }
    }
} 