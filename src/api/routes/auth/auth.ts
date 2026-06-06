import { Router, RequestHandler } from "express";
import trimRequest from 'trim-request'
import { origin } from "../../middlewares";
import { authValidation } from "../../validators";
import { AuthController } from "../../controllers";
import { handleAuthError, requireAuth } from "../../config";
import { roleAuthorization } from "../../middlewares/auth/roleAuthorization.middleware";
import { auth } from "../../middlewares/auth.middleware";
import { ValidationChain } from "express-validator";
import { AuthRole, AuthRoute } from "../../constants/apiRoutes";

const router: Router = Router();
const authController = new AuthController();

// auth route to verify user by tenant and verification id
router.post(
    AuthRoute.VERIFY,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        ...authValidation.verify as ValidationChain[],
        trimRequest.all,
    ],
    authController.verify as RequestHandler
)

// auth route to register user
router.post(
    AuthRoute.REGISTER,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.register
    ],
    authController.register as RequestHandler
)

// auth route to login user
router.post(
    AuthRoute.LOGIN,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.login as ValidationChain[]
    ],
    authController.login as RequestHandler
)

// auth route to check if user exists
router.get(
    AuthRoute.CHECK,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
    ],
    authController.checkExist as RequestHandler
)

// auth route to verify token
router.get(
    AuthRoute.TOKEN,
    [
        auth as RequestHandler,
        requireAuth,
        handleAuthError,
        roleAuthorization([
            AuthRole.ADMIN,
            AuthRole.ORGANIZER,
            AuthRole.REFEREE,
            AuthRole.TEAM_MEMBER,
            AuthRole.VIEWER
        ]) as RequestHandler,
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all
    ],
    authController.verifyToken as RequestHandler
)

// auth route to forgot password
router.post(
    AuthRoute.FORGOT,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.forgotPassword as ValidationChain[]
    ],
    authController.forgotPassword as RequestHandler
)

// auth route to reset password
router.post(
    AuthRoute.RESET,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all,
        ...authValidation.resetPassword as ValidationChain[]
    ],
    authController.resetPassword as RequestHandler
)

// auth route to refresh token
router.post(
    AuthRoute.REFRESH,
    [
        origin.checkDomain as RequestHandler,
        origin.checkTenant as RequestHandler,
        trimRequest.all
    ],
    authController.refreshToken as RequestHandler
)

// TODO: auth route to login with google, facebook 

export default router