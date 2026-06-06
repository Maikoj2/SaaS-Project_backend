import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../interfaces';
import { AuthError } from '../errors/AuthError';
import { TokenService } from '../services/auth/token.service';
import { ApiResponse } from '../responses';
import { DatabaseHelper } from '../utils/database.helper';
import { User } from '../models';

const tokenService = new TokenService();

export const auth = async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
    try {
        const tenant = req.clientAccount;
        if (!tenant) {
            return res.status(401).json(
                ApiResponse.error("The tenant can't be found")
            );
        }
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json(
                ApiResponse.error({
                    message: 'No se proporcionó el token de acceso.',
                    statusCode: 401,
                    name: 'AuthError'
                })
            );
        }

        try {
            // try to verify sign and expiration of jwt 

            const userId = tokenService.getUserIdFromToken(token);
            // search user by tenant 
            const user = await DatabaseHelper.findById(User, userId, tenant, { select: ['-password'] });
            console.log('user', user);

            if (!user) {
                return res.status(401).json(
                    ApiResponse.error({
                        message: 'the user not exist or is inactive or in blocked',
                        statusCode: 401,
                        name: 'AuthError',
                        details: [{ code: 'USER_NOT_FOUND' }]
                    })
                );
            }
            req.id = userId;
            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json(
                ApiResponse.error({
                    message: 'the access token has expired or is invalid',
                    statusCode: 401,
                    name: 'AuthError',
                    details: [{ code: 'ACCESS_TOKEN_EXPIRED' }]
                })
            );
        }
    } catch (error) {
        return res.status(401).json(
            ApiResponse.error({
                message: 'invalid authorization format',
                statusCode: 401,
                name: 'AuthError'
            })
        );
    }
}; 