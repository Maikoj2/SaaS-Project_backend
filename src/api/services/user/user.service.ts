
import { DatabaseHelper } from "../../utils/database.helper";

import { AuthError } from "../../errors/AuthError";
import { User } from "../../models";
import { PaginationOptions } from "../../interfaces";
import { Logger } from "../../config";
import { USER_SELECT_FIELDS } from "../../constants/user.constants";
import { PasswordUtil } from "../../utils";
import { v4 as uuidv4 } from 'uuid';



export class UserService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public getUsers = async ( tenant: string, options: PaginationOptions) => {
        try {
            const query = {};
            const usersOptions = {
                ...options,
                select: USER_SELECT_FIELDS
            };
            const users = await DatabaseHelper.getItems(User, tenant, query, usersOptions);
            this.logger.info('Users found:', {
                count: users.totalDocs,
                page: users.page,
                totalPages: users.totalPages
            });
            return users;
        } catch (error) {
            this.logger.error('Error getting users:', error);
            throw new AuthError('Error getting users', 500);
        }
    }

    public getUserById = async (id: string, tenant: string) => {
        try {
            this.logger.info('Getting user by ID:', { id, tenant });
            const user = await DatabaseHelper.findById(
                User,
                id,
                tenant,
                {
                    select: USER_SELECT_FIELDS,
                    throwError: true,
                    errorMessage: 'User not found'
                }
            );

            return user;
        } catch (error) {
            this.logger.error('Error getting user by ID:', error);
            throw new AuthError(
                error instanceof AuthError ? error.message : 'Error getting user',
                error instanceof AuthError ? error.statusCode : 500
            );
        }
    }
    public async createUser(userData: any, tenant: string) {
        try {
            // Generar código de verificación
            const verificationCode = uuidv4();

            // Preparar datos del usuario
            const userToCreate = {
                ...userData,
                email: userData.email.toLowerCase(),
                verification: verificationCode,
                verified: false
            };

            // Si hay contraseña, encriptarla
            if (userData.password) {
                userToCreate.password = await PasswordUtil.hashPassword(userData.password);
            }

            // Crear usuario
            const newUser = await DatabaseHelper.create(
                User,
                tenant,
                userToCreate
            );

            this.logger.info('User created:', {
                userId: newUser._id,
                email: newUser.email,
                role: newUser.role
            });

            return newUser;
        } catch (error) {
            this.logger.error('Error creating user:', error);
            throw error;
        }
    }


      
}
