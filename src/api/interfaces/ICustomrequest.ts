import { Request } from "express";
import { IUserDocument } from "../models/mongoose/user/User";

export interface IUserCustomRequest extends Request {
    user?: IUserDocument;
    clientAccount?: string;
    id?: string;
    _id?: string;
    role?: 'admin' | 'organizer' | 'referee' | 'team_member' | 'viewer';
    email?: string;
    name?: string;
    password?: string;
    userReferred?: string;
    tenant?: string;
    parentAccount?: string;
    getLocale?: () => string;
    token?: string;
    stepper?: string[];
}