import { Request } from "express";
import { IUser } from "./IUser";

export interface CustomRequest extends Request {
    user?: IUser;
    clientAccount?: string | null;
    id?: string | null;
    _id?: string | null;
    role?: string | null;
    email?: string | null;
    name?: string | null;
    password?: string | null;
    userReferred?: string | null;
    tenant?: string | null;
    parentAccount?: string | null;
    getLocale?: () => string;
}