import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { AuthPermission, RolePermissions } from '../../constants/permissions';

const logger = new Logger();

export const permissionAuthorization = (requiredPermissions: AuthPermission[]) => {
    if (!requiredPermissions || requiredPermissions.length === 0) {
        logger.warn('permissionAuthorization: the list of required permissions is empty');
    }

    return async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                logger.warn('permissionAuthorization - user is missing');
                return res.status(401).json(
                    ApiResponse.error('Not authorized to perform this operation')
                );
            }

            const userRole = user.role;
            if (!userRole) {
                logger.warn('permissionAuthorization - user has no role defined', {
                    userId: user._id
                });
                return res.status(403).json(
                    ApiResponse.error('Not authorized to perform this operation')
                );
            }

            // Cruzamos el rol con nuestro mapa estático para obtener sus permisos
            const userPermissions = RolePermissions[userRole] || [];

            // Validamos si tiene TODOS los permisos requeridos
            const hasPermissions = requiredPermissions.every((permission) => 
                userPermissions.includes(permission)
            );

            if (!hasPermissions) {
                logger.warn('Access denied - insufficient permissions', {
                    userId: user._id,
                    userRole,
                    requiredPermissions,
                    userPermissions,
                });
                return res.status(403).json(
                    ApiResponse.error('Not authorized to perform this operation')
                );
            }

            next();
        } catch (error) {
            logger.error('Internal server error in permissionAuthorization', error);
            return res.status(500).json(
                ApiResponse.error('Internal server error')
            );
        }
    };
};