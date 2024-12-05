import { Response } from 'express';


import { Logger } from '../../config/logger/WinstonLogger';


import { AuthError } from '../../errors/AuthError';
import { CustomRequests, RegisterDTO } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { AuthService } from '../../services/auth.service';


export class AuthController {
    private readonly authService: AuthService;
    private readonly logger: Logger;

    constructor() {
        this.authService = new AuthService();
        this.logger = new Logger();
    }

    public register = async (req: CustomRequests, res: Response): Promise<void> => {
        try {
            this.logger.info('Iniciando registro de usuario', {
                email: req.body.email,
                tenant: req.clientAccount
            });

            const registerData: RegisterDTO = {
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                tenant: req.clientAccount as string
            };

            const result = await this.authService.registerUser(registerData);

            this.logger.info('Usuario registrado exitosamente', {
                userId: result.user._id,
                tenant: req.clientAccount
            });

            res.status(201).json(
                ApiResponse.success(result, 'Usuario registrado exitosamente')
            );

        } catch (error) {
            this.logger.error('Error en registro de usuario:', error);

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

            this.logger.info('Usuario verificado exitosamente', {
                userId: result.user._id,
                tenant: req.clientAccount
            });

            res.status(200).json(
                ApiResponse.success(result, 'Usuario verificado exitosamente')
            );

        } catch (error) {
            this.logger.error('Error en verificación de usuario:', error);

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
} 