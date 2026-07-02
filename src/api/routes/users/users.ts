import { Router, RequestHandler } from 'express';
import { origin } from '../../middlewares/index.js';

import trimRequest from 'trim-request';
import { userValidation } from '../../validators/user/user.validate.js';
import { UserController } from '../../controllers/users/user.controller.js';

import { auth } from '../../middlewares/auth.middleware.js';
import { UsersRoute } from '../../constants/apiRoutes/users/userRoutes.ts.js';
import { permissionAuthorization } from '../../middlewares/auth/permissionAuthorization.middleware.js';
import { AuthPermission } from '../../constants/permissions.js';

const userController = new UserController();


const router: Router = Router();
// Get all users
router.get(UsersRoute.USERS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([
        AuthPermission.USER_READ
    ]) as RequestHandler,
    trimRequest.all as RequestHandler,
    ...userValidation.getUsers,
],
    userController.getUsers as RequestHandler
);

// Get user by id
router.get(UsersRoute.GET_USER_BY_ID, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([
        AuthPermission.USER_READ_DETAIL
    ]) as RequestHandler,
    trimRequest.all,
    ...userValidation.getUserById,

],
    userController.getUserById as RequestHandler
);

// Create user
router.post(UsersRoute.USERS, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([
        AuthPermission.USER_CREATE
    ]) as RequestHandler,
    trimRequest.all as RequestHandler,
    ...userValidation.createUser,
],
    userController.createUser as RequestHandler
);

// Update user
router.patch(UsersRoute.UPDATE_USER, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([
        AuthPermission.USER_UPDATE
    ]) as RequestHandler,
    trimRequest.all,
    ...userValidation.updateUser,
],
    userController.updateUser as RequestHandler
);

// Delete user
router.delete(UsersRoute.DELETE_USER, [
    origin.checkDomain as RequestHandler,
    origin.checkTenant as RequestHandler,
    auth as RequestHandler,
    permissionAuthorization([
        AuthPermission.USER_DELETE
    ]) as RequestHandler,
    trimRequest.all,
    ...userValidation.deleteUser,
],
    userController.deleteUser as RequestHandler
);

export default router;
