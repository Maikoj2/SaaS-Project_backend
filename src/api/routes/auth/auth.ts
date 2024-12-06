import express, { Express, Request, Response } from "express";
import trimRequest from 'trim-request'
import { origin } from "../../middlewares";
import { AuthRoute } from "../../models/auth/authRoutes";
import { authValidation } from "../../validators";
import { AuthController } from "../../controllers";


const app: Express = express();
const authController = new AuthController();


app.post(
    AuthRoute.VERIFY,
    [
        origin.checkDomain,
        origin.checkTenant,
        trimRequest.all,
    ],
    authController.verify
)
app.post(
    AuthRoute.REGISTER,
    [
        origin.checkDomain,
        origin.checkTenant,
        trimRequest.all,
        ...authValidation.register
    ],
    authController.register
)

app.post(
    AuthRoute.LOGIN,
    [
        origin.checkDomain,
        // origin.checkTenant, 
        trimRequest.all,
        ...authValidation.login,
    ],
    authController.login
)
app.get(
    AuthRoute.CHECK,
    [
        origin.checkDomain,
        origin.checkTenant,
        trimRequest.all
    ],
    authController.checkExist
)

export default app