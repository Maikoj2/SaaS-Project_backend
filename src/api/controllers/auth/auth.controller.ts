import { Response } from 'express';
import { matchedData } from 'express-validator';
import { AuthService } from '../../services/auth.service';
import { Logger } from '../../config/logger/WinstonLogger';

import { AuthError } from '../../errors/AuthError';

import { ApiResponse } from '../../responses';
import { CustomRequests } from '../../interfaces';
import { SettingsService } from '../../services';

export class AuthController {
    private readonly authService: AuthService;
    private readonly settingsService: SettingsService;
    private readonly logger: Logger;

    constructor() {
        this.authService = new AuthService();
        this.settingsService = new SettingsService();
        this.logger = new Logger();
    }

    public register = async (req: CustomRequests, res: Response): Promise<void> => {
        try {
            this.logger.info('Iniciando registro de usuario', {
                email: req.body.email,
                tenant: req.clientAccount
            });

            const registerData = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                tenant: req.clientAccount as string
            };

            const result = await this.authService.registerUser(registerData);

            res.status(201).json(
                ApiResponse.success(result, 'Usuario registrado exitosamente')
            );

        } catch (error) {
            this.logger.error('Error en registro:', error);
            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }
            res.status(500).json(
                ApiResponse.error('Error interno del servidor')
            );
        }
    };

    public login = async (req: CustomRequests, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount;
            if (!tenant) {
                throw new AuthError('Tenant no encontrado', 404);
            }

            const data = matchedData(req);
            const result = await this.authService.loginUser({
                email: data.email,
                password: data.password,
                tenant
            });

            res.status(200).json(
                ApiResponse.success(result, 'Login exitoso')
            );

        } catch (error) {
            this.logger.error('Error en login:', error);
            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }
            res.status(500).json(
                ApiResponse.error('Error interno del servidor')
            );
        }
    };

    public verify = async (req: CustomRequests, res: Response): Promise<void> => {
        try {
            this.logger.info('Iniciando verificación de usuario', {
                verificationId: req.body.id,
                tenant: req.clientAccount
            });

            const result = await this.authService.verifyUser(
                req.clientAccount as string,
                req.body.id
            );

            res.status(200).json(
                ApiResponse.success(result, 'Usuario verificado exitosamente')
            );

        } catch (error) {
            this.logger.error('Error en verificación:', error);
            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }
            res.status(500).json(
                ApiResponse.error('Error interno del servidor')
            );
        }
    };

    public checkExist = async (req: CustomRequests, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const settings = await this.settingsService.findByTenant(tenant);

            res.status(200).json(
                ApiResponse.success({ exists: !!settings })
            );
        } catch (error) {
            this.logger.error('Error checking settings:', error);
            res.status(500).json(
                ApiResponse.error('Error al verificar configuraciones')
            );
        }
    };
} 