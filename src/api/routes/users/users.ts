import express, { Express, RequestHandler } from 'express';
;
import { requireAuth } from '../../config/auth/index.js';
import { handleAuthError } from '../../config/auth/index.js';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware.js';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes.js';
import { origin } from '../../middlewares/index.js';

import trimRequest from 'trim-request';
import { userValidation } from '../../validators/user/user.validate.js';
import { UserController } from '../../controllers/users/user.controller.js';
import { UsersRoute } from '../../models/apiRoutes/users/userRoutes.ts.js';
import { auth } from '../../middlewares/auth.middleware.js';
import { ValidationChain } from 'express-validator';

const userController = new UserController();


const app: Express = express();
// Get all users
app.get(UsersRoute.USERS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER
    ]),
    trimRequest.all,
    userValidation.getUsers,
],
    userController.getUsers as RequestHandler
);

// Get user by id
app.get(UsersRoute.GET_USER_BY_ID, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER,
        AuthRole.TEAM_MEMBER
    ]),
    trimRequest.all,
    userValidation.getUserById,

],
    userController.getUserById as RequestHandler
);

// Create user
app.post(UsersRoute.USERS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER
    ]),
    userValidation.createUser,
    trimRequest.all,
],
    userController.createUser as RequestHandler
);
// Create user by link invitation
app.post(UsersRoute.USERS_BY_LINK, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    ...userValidation.createUserByLink as ValidationChain[],
],
    userController.createUserByLink as RequestHandler
);

// Update user
app.patch(UsersRoute.UPDATE_USER, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    roleAuthorization([
        AuthRole.ADMIN,
    ]),
    trimRequest.all,
    userValidation.updateUser,
],
    userController.updateUser as RequestHandler
);

// Delete user
app.delete(UsersRoute.DELETE_USER, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    requireAuth,
    roleAuthorization([
        AuthRole.ADMIN,
    ]),
    handleAuthError,
    trimRequest.all,
    userValidation.deleteUser,
],
    userController.deleteUser as RequestHandler
);

export default app;
