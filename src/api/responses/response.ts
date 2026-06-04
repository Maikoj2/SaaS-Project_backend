import { Response } from 'express';
import { ApiResponse } from './apiResponse';
import { HttpStatusCode } from '../constants/httpStatusCodes';

export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = HttpStatusCode.OK
): void => {
    res.status(statusCode).json(ApiResponse.success(data, message));
};

export const errorResponse = (
    res: Response,
    error: any,
    statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
    details?: any
): void => {
    // If error is a string, wrap it in an object expected by ApiResponse.error
    // or handle it directly if ApiResponse.error supports strings (which it does based on previous view_file)
    const response = ApiResponse.error(error);

    // If details are provided, we might want to attach them. 
    // However, ApiResponse.error logic seems to handle 'details' if passed in the error object.
    // For now, let's stick to the basic usage.
    // If the user passed specific details that are not in the error object, we might need to adjust.
    // But based on usage in validators (errors.array()), it seems 'details' is passed as the 4th arg.

    // Let's look at ApiResponse.error again.
    // It accepts CustomError | IErrorResponse | string | Error.
    // If we pass a string, it creates a CustomError with 500.

    // If we want to respect the statusCode passed to errorResponse, we might need to construct the error object manually if it's a string.

    let finalError = error;
    if (typeof error === 'string') {
        finalError = {
            message: error,
            statusCode: statusCode,
            name: 'Error',
            details: details
        };
    } else if (details) {
        // If error is an object, try to add details
        finalError = { ...error, details };
    }

    res.status(statusCode).json(ApiResponse.error(finalError));
};
