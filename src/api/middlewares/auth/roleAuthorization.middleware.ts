import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';

export const roleAuthorization = (allowedRoles: string[]) => {
    const logger = new Logger();
    
    return async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
        try {
            const userRole = req.user?.role;

            if (!userRole || !allowedRoles.includes(userRole)) {
                logger.warn('Acceso denegado - Rol no autorizado', {
                    userRole,
                    allowedRoles,
                    userId: req.user?._id
                });

                return res.status(403).json(
                    ApiResponse.error('No autorizado para esta operación')
                );
            }

            next();
        } catch (error) {
            logger.error('Error en autorización de rol:', error);
            return res.status(403).json(
                ApiResponse.error('Error en autorización')
            );
        }
    };
}; 