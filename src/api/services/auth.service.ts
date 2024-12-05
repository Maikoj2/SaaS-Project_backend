import { Injectable } from '@decorators/di';


import { AuthError } from '../errors/AuthError';

import { User } from '../models/mongoose';
import { AuthResponse, RegisterDTO } from '../interfaces';
import { TokenService } from './token.service';
import { SettingsService } from './settings.service';

@Injectable()
export class AuthService {
    private readonly tokenService: TokenService;
    private readonly settingsService: SettingsService;
    

    constructor() {
        this.tokenService = new TokenService();
        this.settingsService = new SettingsService();
    
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
} 