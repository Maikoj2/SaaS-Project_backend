import { Injectable } from '@decorators/di';
import { Logger } from '../../config';
import { User } from '../../models';    
import { PasswordUtil, DataProcessor } from '../../utils';
import { AuthService } from '../auth/auth.service';
import { DatabaseHelper } from '../../utils/database.helper';

@Injectable()
export class ProfileService {
    private readonly logger: Logger;
    private readonly authService: AuthService;

    constructor() {
        this.logger = new Logger();
        this.authService = new AuthService();
    }

    public async getProfile(userId: string, tenant: string) {
        try {
            const profile = await DatabaseHelper.findById(User, userId, tenant, {
                select: [],
                throwError: true,
                errorMessage: 'User not found'
            });

            if (!profile) {
                throw new Error('User not found');
            }

            return profile;
        } catch (error) {
            this.logger.error('Error in getProfile:', error);
            throw error;
        }
    }

    public async updateProfile(userId: string, updateData: any, tenant: string) {
        try {
            const processedData = DataProcessor.processAllData(updateData);

            const updatedUser = await User.byTenant(tenant)
                .findByIdAndUpdate(
                    userId,
                    processedData,
                    {
                        new: true,              // return the updated document
                        runValidators: true,    // run validators from the schema
                        select: '-password -role -_id -updatedAt -createdAt'
                    }
                );

            if (!updatedUser) {
                throw new Error('Profile not found');
            }

            return updatedUser;
        } catch (error) {
            this.logger.error('Error updating profile:', error);
            throw error;
        }
    }

    public async changePassword(userId: string, tenant: string, body: any) {
        try {
            const { oldPassword, newPassword } = body;
            const user = await DatabaseHelper.findById(User, userId, tenant, {
                select: ['+password']
            });

            if (!user) {
                throw new Error('Profile not found');
            }
            console.log(user);

            const isMatch = await PasswordUtil.comparePassword(oldPassword, user.password);

            if (!isMatch) {
                throw new Error('Invalid password');
            }
            return this.changePasswordInDatabase(userId, tenant, newPassword);
        } catch (error) {
            this.logger.error('Error validating id:', error);
            throw error;
        }
    }

    public async updateStepper(userId: string, stepper: string) {
        try {
            // const user = await UserHelper.findUserById(User, userId, tenant, {
            //     select: [],
            //     throwError: true,
            //     errorMessage: 'User not found'
            // });
        } catch (error) {
            this.logger.error('Error updating stepper:', error);
            throw error;
        }
    }
    private async changePasswordInDatabase(userId: string, tenant: string, newPassword: string) {
        const hashedPassword = await PasswordUtil.hashPassword(newPassword);
        return new Promise((resolve, reject) => {
            User.byTenant(tenant)
                .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
                .then(user => resolve(user))
                .catch(error => reject(error));
        }); 
    }
}