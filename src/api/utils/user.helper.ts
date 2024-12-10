import { AuthError } from '../errors/AuthError';
import { Types } from 'mongoose';
import { IUserDocument, IUserModel } from '../models/mongoose/user/User';
import { IUser } from '../interfaces';

interface FindUserOptions {
    select?: string[];
    throwError?: boolean;
    errorMessage?: string;
}

export class UserHelper {
    static async findUserById(
        model: IUserModel,
        id: string,
        tenant: string,
        options: FindUserOptions = {}
    ): Promise<IUserDocument | null> {
        if (!Types.ObjectId.isValid(id)) {
            throw new AuthError('Invalid ID format', 400);
        }

        return this.findUser(model, tenant, { _id: new Types.ObjectId(id) }, options);
    }

    static async findUserByEmail(
        model: IUserModel,
        email: string,
        tenant: string,
        options: FindUserOptions = {}
    ): Promise<IUserDocument | null> {
        if (!email) {
            throw new AuthError('Email is required', 400);
        }

        return this.findUser(
            model, 
            tenant, 
            { email: email.toLowerCase() }, 
            options
        );
    }

    static async findUserByField(
        model: IUserModel,
        field: keyof IUserDocument,
        value: any,
        tenant: string,
        options: FindUserOptions = {}
    ): Promise<IUserDocument | null> {
        return this.findUser(
            model,
            tenant,
            { [field]: value },
            options
        );
    }

    private static async findUser(
        model: IUserModel,
        tenant: string,
        query: Record<string, any>,
        options: FindUserOptions = {}
    ): Promise<IUserDocument | null> {
        const {
            select = [],
            throwError = false,
            errorMessage = 'User not found'
        } = options;

        try {
            const userQuery = model.byTenant(tenant)
                .findOne(query);

            if (select.length > 0) {
                userQuery.select(select);
            }

            const user = await userQuery;

            if (!user && throwError) {
                throw new AuthError(errorMessage, 404);
            }

            return user;
        } catch (error) {
            if (error instanceof AuthError) throw error;
            throw new AuthError('Error finding user', 500);
        }
    }
} 