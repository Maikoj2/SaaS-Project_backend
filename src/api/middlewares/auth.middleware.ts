import { Response, NextFunction } from 'express';
import { CustomRequest } from '../interfaces';
import { AuthError } from '../errors/AuthError';
import { TokenService } from '../services/token.service';

const tokenService = new TokenService();

export const auth = async (req: CustomRequest, res: Response, next: NextFunction) => {
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
                
                res.setHeader('Authorization', `Bearer ${newToken}`);
                req.id = userId;
                next();
            } catch (refreshError) {
                return res.status(401).json({
                    status: 'error',
                    code: 'ACCESS_TOKEN_EXPIRED',
                    message: 'El token de acceso ha expirado',
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