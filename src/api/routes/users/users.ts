import express, { Express, RequestHandler } from 'express';
import { UsersRoute } from '../../models/apiRoutes/users/userRoutes.ts';
import { auth } from '../../middlewares/auth.middleware.js';
import { requireAuth } from '../../config/auth/index.js';
import { handleAuthError } from '../../config/auth/index.js';
import { roleAuthorization } from '../../middlewares/auth/roleAuthorization.middleware.js';
import { AuthRole } from '../../models/apiRoutes/auth/authRoutes.js';
import { origin } from '../../middlewares/index.js';
import { UserController } from '../../controllers/users/user.controller.js';
import trimRequest from 'trim-request';
import { userValidation } from '../../validators/user/user.validate.js';

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
        AuthRole.ORGANIZER
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



export default app;
