import { Response, NextFunction } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { AuthRole } from '../../constants/apiRoutes';

const logger = new Logger();
export const roleAuthorization = (allowedRoles: AuthRole[]) => {

    if (!allowedRoles || allowedRoles.length == 0)
        logger.warn("roleAuthorization the list is empty ", {
            allowedRoles
        });



    return async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                logger.warn("roleAuthorization - user is missing", {
                    req
                })
                return res.status(401).json(
                    ApiResponse.error('Not authorized to perform this operation')
                );
            }

            const userRole = user.role;

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