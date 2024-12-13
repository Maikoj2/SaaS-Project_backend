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

const userController = new UserController();


const app: Express = express();

app.get(UsersRoute.USERS, [
    auth as RequestHandler,
    requireAuth,
    handleAuthError,
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    roleAuthorization([
        AuthRole.ADMIN,
        AuthRole.ORGANIZER
    ]),
    trimRequest.all,
],
    userController.getUsers as RequestHandler
);

export default app;
