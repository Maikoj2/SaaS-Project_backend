import express, { Express, Request, Response } from "express";
import trimRequest from 'trim-request'
import { origin } from "../../middlewares";
import { AuthRoute } from "../../models/auth/authRoutes";
import { AuthController } from "../../controllers/auth/auth"; '../../controllers/auth/auth.controller';


const app: Express = express();
const authController = new AuthController();


app.post(
    AuthRoute.VERIFY,
    origin.checkDomain,
    origin.checkTenant, 
    trimRequest.all, 
    authController.verify
)
app.post(
    AuthRoute.REGISTER,
    origin.checkDomain,
    origin.checkTenant, 
    trimRequest.all, 
    authController.register
)

export default app