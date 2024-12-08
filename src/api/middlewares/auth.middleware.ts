import { Response, NextFunction } from 'express';
import { CustomRequest } from '../interfaces';
import { AuthError } from '../errors/AuthError';
import { TokenService } from '../services/token.service';

const tokenService = new TokenService();

export const auth = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        // Obtener token del header
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            throw new AuthError('Token not provided', 401);
        }

        try {
            // verify access token
            const userId = tokenService.getUserIdFromToken(token);
            req.id = userId;
            next();
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                // Token expired, the client must use refresh token
                res.status(401).json({
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
                return;
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
}; 