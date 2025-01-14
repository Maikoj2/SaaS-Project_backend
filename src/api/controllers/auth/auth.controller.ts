import { Response } from 'express';
import { matchedData } from 'express-validator';
import { AuthService } from '../../services/auth/auth.service';
import { Logger } from '../../config/logger/WinstonLogger';

import { CustomError } from '../../errors';

import { ApiResponse } from '../../responses';


import { ICustomRequest } from '../../interfaces';
import { SettingsService } from '../../services/setting/settings.service';



export class AuthController {
    private readonly authService: AuthService;
    private readonly settingsService: SettingsService;
    private readonly logger: Logger;

    constructor() {
        this.authService = new AuthService();
        this.settingsService = new SettingsService();
        this.logger = new Logger();
    }

    public register = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const registerData = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                tenant: req.clientAccount as string
            };
            

            const result = await this.authService.registerUser(registerData);

            res.status(201).json(
                ApiResponse.success(result, 'User registered successfully')
            );

        } catch (error) {
            this.logger.error('Error en registro:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error registering user', 500, 'AuthControllerError')));
        }
    };

    public login = async (req: ICustomRequest, res: Response): Promise<void> => {
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
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error logging in', 500, 'AuthControllerError')));
        }
    };

    public verify = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const { tenant, verificationCode } = req.params;
            this.logger.info('Verifying user:', {
                tenant,
                verificationCode
            });
            
            const result = await this.authService.verifyUser(
                tenant,
                verificationCode
            );
            res.status(200).json(
                ApiResponse.success(result, 'User verified successfully')
            );

        } catch (error) {
            this.logger.error('Error in verification:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error verifying user', 500, 'AuthControllerError')));
        }
    };

    public checkExist = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const settings = await this.settingsService.findByTenant(tenant);

            res.status(200).json(
                ApiResponse.success({ exists: !!settings })
            );
        } catch (error) {
            this.logger.error('Error checking settings:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error to check settings', 500, 'AuthControllerError')));
        }
    };

    public verifyToken = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const result = await this.authService.refreshToken(req);

            res.status(200).json(
                ApiResponse.success(result, 'Token updated successfully')
            );

        } catch (error) {
            this.logger.error('Error refreshing token:', error);

            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error to refresh token', 500, 'AuthControllerError')));
        }
    };

    public refreshToken = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const result = await this.authService.refreshToken(req);

            res.status(200).json(
                ApiResponse.success(result, 'Token updated successfully')
            );
        } catch (error) {
            this.logger.error('Error refreshing token:', error);
            ApiResponse.error(new CustomError('Error to refresh token', 500, 'AuthControllerError'))    
        }
    };

    public forgotPassword = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount;
            const locale = req.getLocale?.() || 'es';
            const { email } = req.body;
            const result = await this.authService.forgotPassword(
                email,
                tenant as string ,
                locale,
                req
            );
            
            res.status(200).json(
                ApiResponse.success(result, 'RESET_EMAIL_SENT')
            );
        } catch (error) {
            this.logger.error('Error in forgot password:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error in forgot password', 500, 'AuthControllerError')));
        }
    };

    public resetPassword = async (req: ICustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const {  newPassword } = req.body;
        
            const urlId = req.query.urlId as string;
            this.logger.info('Reset password request:', {
                tenant,
                urlId,
                newPassword
            });
            this.validateField(urlId, 'Token is missing');
            this.validateField(newPassword, 'New password is missing');
    
            const result = await this.authService.resetPassword(
                urlId,
                newPassword,
                tenant
            );
    
            res.status(200).json(
                ApiResponse.success(result, 'PASSWORD_CHANGED')
            );
        } catch (error) {
            this.logger.error('Error in reset password:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error in reset password', 500, 'AuthControllerError')));
        }
    };

    private validateField(field: any, message: string): void {
        if (!field) {
            throw new CustomError(message, 404);
        }
    } 
    
} 