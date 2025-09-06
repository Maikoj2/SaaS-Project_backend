import { Response, NextFunction } from 'express';
import { ICustomRequest } from '../interfaces';
import { CustomError } from '../errors';
import { TokenService } from '../services/auth/token.service';
import { ApiResponse } from '../responses';

const tokenService = new TokenService();

export const auth = async (req: ICustomRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            throw new CustomError('Token not provided', 401, 'AuthMiddlewareError');
        }

        try {
            // Intenta verificar el access token
            const userId = tokenService.getUserIdFromToken(token);
            req.id = userId;
            next();
        }
        catch (error) {
            // Si es ruta de refresh, permite continuar
            if (req.path.includes('/refresh-token')) {
                req.token = token;
                next();
                return;
            }

            // Para otras rutas, intenta refresh automático
            try {
                const newToken = await tokenService.refreshTokens(token);
                return res.status(200).json(ApiResponse.success({
                    status: 'warning',
                    code: 'TOKEN_REFRESHED',
                    message: 'Your session was about to expire and has been renewed',
                    newToken: `Bearer ${newToken}`,
                    shouldRefresh: true
                }));
            }
            catch (refreshError) {
                return res.status(401).json(ApiResponse.error(new CustomError('Your access token has expired', 401, 'AuthMiddlewareError')));
            }

        }
    }
    catch (error) {
        return res.status(401).json(ApiResponse.error(new CustomError('Your access token has expired', 401, 'AuthMiddlewareError')));
    }
}; 