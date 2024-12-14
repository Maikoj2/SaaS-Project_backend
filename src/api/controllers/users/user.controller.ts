import { Request, Response } from 'express';
import { UserService } from "../../services/user/user.service";
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';
import { Logger } from '../../config';
import { MongooseHelper } from '../../utils';
import { matchedData } from 'express-validator';
import { EmailService } from '../../services/email/email.service';
import { AuthService } from '../../services/auth/auth.service';
import { DatabaseHelper } from '../../utils/database.helper';
import { User } from '../../models';





export class UserController {
    private readonly userService: UserService;
    private readonly logger: Logger;
    private readonly emailService: EmailService;
    private readonly authService: AuthService;

    public createUser = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const locale = req.getLocale?.() || 'es';
            const rawReq = req;
            
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
                    tenant
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
            res.status(500).json(
                ApiResponse.error('Error creating user')
            );
        }
    };

    constructor() {
        this.userService = new UserService();
        this.logger = new Logger();
        this.emailService = new EmailService();
        this.authService = new AuthService();
    }
    public getUsers = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const options = this.listInitOptions(req);            
            const user = await this.userService.getUsers( tenant, options);
        
            res.status(200).json(
                ApiResponse.success(user, 'Users retrieved successfully')
            );
        } catch (error) {
            res.status(500).json(
                ApiResponse.error('Error retrieving users')
            );
        }
    }

    public getUserById = async (req: IUserCustomRequest, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount as string;
            await MongooseHelper.validateId(id);
            this.logger.info('Getting user by ID:', { id, tenant });
            const user = await this.userService.getUserById(id, tenant);
            res.status(200).json(ApiResponse.success(user, 'User fetched successfully'));
        } catch (error) {
            res.status(500).json(ApiResponse.error('Error fetching user'));
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
            ApiResponse.error('Error fetching user')
        }
    }

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
