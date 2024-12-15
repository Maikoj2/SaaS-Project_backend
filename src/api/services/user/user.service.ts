
import { DatabaseHelper } from "../../utils/database.helper";
import { AuthError } from "../../errors/AuthError";
import { User } from "../../models";
import { PaginationOptions } from "../../interfaces";
import { Logger } from "../../config";
import { USER_SELECT_FIELDS } from "../../constants/user.constants";
import { PasswordUtil, DataProcessor } from "../../utils";
import { v4 as uuidv4 } from 'uuid';



export class UserService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async getUsers(tenant: string, options: PaginationOptions) {
        try {
            const query = {};
            const usersOptions = {
                ...options,
                select: USER_SELECT_FIELDS
            };
            const users = await DatabaseHelper.getItems(User, tenant, query, usersOptions);
            return users;
        } catch (error) {
            this.logger.error('Error getting users:', error);
            throw new AuthError('Error getting users', 500);
        }
    }

    public async getUserById(id: string, tenant: string) {
        try {
            this.logger.info('Getting user by ID:', { id, tenant });
            const user = await DatabaseHelper.findById(
                User,
                id,
                tenant,
                {
                    select: USER_SELECT_FIELDS,
                    throwError: true,
                    errorMessage: `User: ${id} not found`
                }
            );

            return user;
        } catch (error) {
            this.logger.error('Error getting user by ID:', error);
            throw error;
        }
    }

    public async createUser(userData: any, tenant: string) {
        try {
            // Generar código de verificación
            const verificationCode = uuidv4();
            console.log('Datos recibidos:', userData);
            
            const processedData = DataProcessor.processAllData(userData);
            console.log('Processed data:', processedData);
        
            const userToCreate = {
                ...processedData,
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

    public async updateUser(id: string, tenant: string, userData: any) {
        
        try {
            const existingUser = await DatabaseHelper.findById(User, id, tenant, {
                throwError: true,
                errorMessage: `Usuario ${id} no encontrado`
            });
    
            if (!existingUser) {
                throw new AuthError('Usuario no encontrado', 404);
            }
    
            const processedData = DataProcessor.processSocialNetworks(userData);
            const updatedUser = await DatabaseHelper.update(User, id, tenant, processedData, {
                new: true,
                runValidators: true,
            });
            return updatedUser;
        } catch (error) {
            this.logger.error('Error updating user:', error);
            throw error;
        }
    }


      
}
