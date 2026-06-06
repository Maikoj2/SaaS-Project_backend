import express, { Express, RequestHandler } from 'express';
;
import { requireAuth } from '../../config/auth/index.js';
import { handleAuthError } from '../../config/auth/index.js';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware.js';
import { origin } from '../../middlewares/index.js';

import trimRequest from 'trim-request';
import { userValidation } from '../../validators/user/user.validate.js';
import { UserController } from '../../controllers/users/user.controller.js';

import { auth } from '../../middlewares/auth.middleware.js';
import { UsersRoute } from '../../constants/apiRoutes/users/userRoutes.ts.js';
import { AuthRole } from '../../constants/apiRoutes/index.js';

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
    userValidation.createUser,
],
    userController.createUser as RequestHandler
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
