import { Injectable } from '@decorators/di';
import { Logger } from '../config';
import { User } from '../models/mongoose/user';
import { MongooseHelper } from '../utils/mongoose.helper';
import { IUser } from '../interfaces';
import { SocialNetworkHelper } from '../utils';

@Injectable()
export class ProfileService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async getProfile(userId: string, tenant: string) {
        try {
            // Validar ID
            await MongooseHelper.validateId(userId);

            const user = await User.byTenant(tenant)
                .findById(userId)
                .select('-password');

            if (!user) {
                throw new Error('User not found');
            }

            return user;
        } catch (error) {
            this.logger.error('Error in getProfile:', error);
            throw error;
        }
    }

    public async updateProfile(userId: string, updateData: any, tenant: string) {
        try {
            // validate id
            await MongooseHelper.validateId(userId);

            const processedData = SocialNetworkHelper.processSocialNetworks(updateData);

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
                throw new Error('User not found');
            }

            return updatedUser;
        } catch (error) {
            this.logger.error('Error updating profile:', error);
            throw error;
        }
    }
}