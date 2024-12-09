import { Response } from 'express';
import { matchedData } from 'express-validator';
import { AuthService } from '../../services/auth.service';
import { Logger } from '../../config/logger/WinstonLogger';

import { AuthError } from '../../errors/AuthError';

import { ApiResponse } from '../../responses';
import { CustomRequest } from '../../interfaces';
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

    public register = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
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

    public login = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount;
            this.validateField(tenant, 'Tenant no encontrado')

            const data = matchedData(req);
            const result = await this.authService.loginUser({
                email: data.email,
                password: data.password,
                tenant: tenant as string
            });
            this.logger.info('Token generado:', {
                userId: result.user._id,
                token: result.session // el token que generas
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

    public verify = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            this.logger.info('Starting user verification', {
                verificationId: req.body.id,
                tenant: req.clientAccount
            });

            const result = await this.authService.verifyUser(
                req.clientAccount as string,
                req.body.id
            );

            res.status(200).json(
                ApiResponse.success(result, 'User verified successfully')
            );

        } catch (error) {
            this.logger.error('Error in verification:', error);
            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }
            res.status(500).json(
                ApiResponse.error('Internal server error')
            );
        }
    };

    public checkExist = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const settings = await this.settingsService.findByTenant(tenant);

            res.status(200).json(
                ApiResponse.success({ exists: !!settings })
            );
        } catch (error) {
            this.logger.error('Error checking settings:', error);
            res.status(500).json(
                    ApiResponse.error('Error to check settings')
            );
        }
    };

    public verifyToken = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const result = await this.authService.refreshToken(req);

            res.status(200).json(
                ApiResponse.success(result, 'Token updated successfully')
            );

        } catch (error) {
            this.logger.error('Error refreshing token:', error);

            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }

            res.status(500).json(
                ApiResponse.error('Error to refresh token')
            );
        }
    };
    public refreshToken = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const result = await this.authService.refreshToken(req);

            res.status(200).json(
                ApiResponse.success(result, 'Token updated successfully')
            );
        } catch (error) {
            this.logger.error('Error refreshing token:', error);
            if (error instanceof AuthError) {
                res.status(error.statusCode).json(
                    ApiResponse.error(error.message)
                );
                return;
            }
            res.status(500).json(
                ApiResponse.error('Internal server error')
            );
        }
    };

    public forgotPassword = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount;
            const locale = req.getLocale?.() || 'es';
            const { email } = req.body;
            this.validateField(tenant, 'Tenant is missing')
            const result = await this.authService.forgotPassword(
                email,
                tenant as string ,
                locale
            );
            
            res.status(200).json(
                ApiResponse.success(result, 'RESET_EMAIL_SENT')
            );
        } catch (error) {
            this.logger.error('Error in forgot password:', error);
            ApiResponse.error('Error in forgot password:');
        }
    };

    public resetPassword = async (req: CustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const {  newPassword } = req.body;
        
            const token = req.query.token as string;
            this.logger.info('Reset password request:', {
                tenant,
                token,
                newPassword
            });
            this.validateField(tenant, 'Tenant is missing');
            this.validateField(token, 'Token is missing');
            this.validateField(newPassword, 'New password is missing');
    
            const result = await this.authService.resetPassword(
                token,
                newPassword,
                tenant
            );
    
            res.status(200).json(
                ApiResponse.success(result, 'PASSWORD_CHANGED')
            );
        } catch (error) {
            this.logger.error('Error in reset password:', error);
            ApiResponse.error('Error in reset password:');
        }
    };

    private validateField(field: any, message: string): void {
        if (!field) {
            throw new AuthError(message, 404);
        }
    } 
} 