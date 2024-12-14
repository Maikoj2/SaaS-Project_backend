import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../interfaces';
import { AuthError } from '../errors/AuthError';
import { TokenService } from '../services/auth/token.service';

const tokenService = new TokenService();

export const auth = async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            throw new AuthError('Token not provided', 401);
        }

        try {
            // Intenta verificar el access token
            const userId = tokenService.getUserIdFromToken(token);
            req.id = userId;
            next();
        } catch (error) {
            // Si es ruta de refresh, permite continuar
            if (req.path.includes('/refresh-token')) {
                req.token = token;
                next();
                return;
            }

            // Para otras rutas, intenta refresh automático
            try {
                const newToken = await tokenService.refreshTokens(token);
                const userId = tokenService.getUserIdFromToken(newToken);
                
                return res.status(200).json({
                    status: 'warning',
                    code: 'TOKEN_REFRESHED',
                    message: 'Your session was about to expire and has been renewed',
                    newToken: `Bearer ${newToken}`,
                    shouldRefresh: true
                });
            } catch (refreshError) {
                return res.status(401).json({
                    status: 'error',
                    code: 'ACCESS_TOKEN_EXPIRED',
                    message: 'Your access token has expired',
                    shouldRefresh: true
                });
            }
        }
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            code: 'INVALID_TOKEN',
            message: error instanceof Error ? error.message : 'Token inválido',
            shouldRefresh: false
        });
    }
}; 