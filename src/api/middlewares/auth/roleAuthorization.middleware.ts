import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { AuthRole } from '../../constants/apiRoutes';

export const roleAuthorization = (allowedRoles: AuthRole[]) => {
    const logger = new Logger();

    return async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
        try {

            const userRole = req.user?.role;

            if (!userRole || !allowedRoles.includes(userRole)) {
                logger.warn('access denied', {
                    userRole,
                    allowedRoles,
                });

                return res.status(403).json(
                    ApiResponse.error('Not authorized to perform this operation')
                );
            }

            next();
        } catch (error) {
            logger.error('Internal server error', error);
            return res.status(500).json(
                ApiResponse.error('Internal server error')
            );
        }
    };
}; 