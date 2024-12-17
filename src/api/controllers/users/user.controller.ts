import {  Response } from 'express';
import { UserService } from "../../services/user/user.service";
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { Logger } from '../../config/logger/WinstonLogger';
import { matchedData } from 'express-validator';
import { EmailService } from '../../services/email/email.service';
import { AuthService } from '../../services/auth/auth.service';
import { DatabaseHelper } from '../../utils/database.helper';
import { User } from '../../models';
import { AuthError } from '../../errors';

export class UserController {
    private readonly userService: UserService;
    private readonly logger: Logger;
    private readonly emailService: EmailService;
    private readonly authService: AuthService;

    

    constructor() {
        this.userService = new UserService();
        this.logger = new Logger();
        this.emailService = new EmailService();
        this.authService = new AuthService();
    }

    public createUser = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const locale = req.getLocale?.() || 'es';

            // Obtener datos validados
            const validatedData = matchedData(req);

            // Verificar si el email existe
            const emailExists = await DatabaseHelper.exists(User, tenant, { email: validatedData.email });

            if (!emailExists) {
                // Crear usuario
                const newUser = await this.userService.createUser(validatedData, tenant);

                // Generar token para reseteo de contraseña
                const forgotPasswordData = await this.authService.saveForgotPassword(
                    newUser.email,
                    tenant,
                    req
                );
                this.logger.info('Forgot password record created:', forgotPasswordData);

                // Enviar email solo para roles específicos
                if (['admin', 'organizer'].includes(newUser.role)) {
                    await this.emailService.sendRegistrationEmail({
                        email: newUser.email,
                        name: newUser.name,
                        locale,
                        tenant,
                        verificationCode: newUser.verification || ''
                    });
                }

                res.status(201).json(
                    ApiResponse.success(newUser, 'User created successfully')
                );
            } else {
                res.status(422).json(
                    ApiResponse.error('Email already exists')
                );
            }

        } catch (error) {
            this.logger.error('Error creating user:', error);
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error creating user'));
        }
    };

    public getUsers = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const options = this.listInitOptions(req);
            const user = await this.userService.getUsers(tenant, options);

            res.status(200).json(
                ApiResponse.success(user, 'Users retrieved successfully')
            );
        } catch (error) {
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error fetching users'));
        }
    }

    public getUserById = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount as string;

            const user = await this.userService.getUserById(id, tenant);

            res.status(200).json(ApiResponse.success(user, 'User fetched successfully'));

        } catch (error) {
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error fetching user'));
        }
    }

    public async getCurrentUser(req: IUserCustomRequest, res: Response): Promise<void> {
        try {
            const userId = req.user?._id;
            const tenant = req.clientAccount as string;

            if (!userId) {
                throw new Error('User not authenticated');
            }

            const user = await this.userService.getUserById(userId.toString(), tenant);
            res.status(200).json(
                ApiResponse.success(user, 'User fetched successfully')
            );
        } catch (error) {
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error fetching user'));
        }
    }

    public  updateUser = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const userId = req.params.id;
            const tenant = req.clientAccount as string;
            const updateData = req.body;
    
            // Eliminar la condición incorrecta que estaba antes
            if (!userId) {
                this.logger.error('ID de usuario no proporcionado');
                throw new AuthError('ID de usuario requerido', 400);
            }
    
            this.logger.info('Iniciando proceso de actualización', {
                userId,
                tenant,
                updateFields: Object.keys(updateData)
            });
    
            // Llamar al servicio
            const updatedUser = await this.userService.updateUser(
                userId, 
                tenant, 
                updateData
            );
    
            this.logger.info('Actualización completada', {
                userId,
                success: true
            });
    
            res.status(200).json(
                ApiResponse.success(updatedUser, 'Usuario actualizado exitosamente')
            );
    
        } catch (error) {
            this.logger.error('Error en controlador de actualización', {
                error: error instanceof Error ? error.message : 'Error desconocido',
                userId: req.params.id,
                tenant: req.clientAccount
            });
    
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(
                    error instanceof Error ? error.message : 'Error al actualizar usuario'
                ));
        }
    }
    
    public deleteUser = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount as string;

            const deletedUser = await this.userService.deleteUser(id, tenant);

            res.status(200).json(ApiResponse.success(deletedUser, 'User deleted successfully'));
        } catch (error) {
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : 'Error deleting user'));
        }
    }


    // private methods
    private listInitOptions = (req: IUserCustomRequest) => {
        const order = parseInt(req.query.order?.toString() || '-1', 10);
        const sort = req.query.sort?.toString() || 'createdAt';
        const sortBy = this.buildSort(sort, order);
        const page = parseInt(req.query.page?.toString() || '1', 10);
        const limit = parseInt(req.query.limit?.toString() || '15', 10);

        return {
            sort: sortBy,
            lean: true,
            page,
            limit
        };
    };
    private buildSort = (sort: string, order: number): Record<string, 1 | -1> => {
        const sortBy: Record<string, 1 | -1> = {};
        sortBy[sort] = order === 1 ? 1 : -1;
        return sortBy;
    };

    

}
