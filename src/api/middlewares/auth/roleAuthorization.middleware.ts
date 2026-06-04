import { Response, NextFunction } from 'express';
import { ICustomRequest } from '../../interfaces';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { CustomError } from '../../errors';

export const roleAuthorization = (allowedRoles: string[]) => {
    const logger = new Logger();
    
    return async (req: ICustomRequest, res: Response, next: NextFunction) => {
        try {
            logger.info('roleAuthorization middleware', {
                userId: req.user?._id,
                role: req.user?.role,
            });
            const userRole = req.user?.role;

            if (!userRole || !allowedRoles.includes(userRole)) {
                logger.warn('Acceso denegado - Rol no autorizado', {
                    userRole,
                    allowedRoles,
                    userId: req.user?._id
                });

                return res.status(403).json(
                    ApiResponse.error(new CustomError('No authorized for this operation', 403, 'RoleAuthorizationError'))
                );
            }

            next();
        } catch (error) {
            logger.error('Error en autorización de rol:', error);
            return res.status(403).json(
                ApiResponse.error(new CustomError('Error en autorización', 403, 'RoleAuthorizationError'))
            );
        }
    };
}; 