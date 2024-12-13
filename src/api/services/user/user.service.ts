import { Logger } from "../../config";
import { DatabaseHelper } from "../../utils/database.helper";

import { AuthError } from "../../errors/AuthError";
import { User } from "../../models";
import { PaginationOptions } from "../../interfaces";



export class UserService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async getUsers( tenant: string, options: PaginationOptions){
        try {
            const query = {};
            const users = await DatabaseHelper.getItems(User, tenant, query, options);
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

    public async getUserById(id: string, tenant: string){
        try {
            this.logger.info('Getting user by ID:', { id, tenant });

            const user = await DatabaseHelper.findById(
                User,
                id,
                tenant,
                {
                    select: ['name', 'email', 'role', 'verified'],
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

      
}
