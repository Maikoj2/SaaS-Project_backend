import { Request } from "express";

export interface CustomRequests extends Request {
    clientAccount?: string | null;
    id?: string | null;
    email?: string | null;
    name?: string | null;
    password?: string | null;
    userReferred?: string | null;
    tenant?: string | null;
}