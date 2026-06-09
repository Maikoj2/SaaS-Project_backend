import { BaseError } from "./baseError";


export class CustomError extends BaseError {
    constructor(message: string, statusCode: number = 401, name: string = 'AuthError') {
        super(message, statusCode, name);
    }
}

