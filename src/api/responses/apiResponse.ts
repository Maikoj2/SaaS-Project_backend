import { ValidationError } from "express-validator";
import { CustomError } from "../errors";

interface IApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: any;
}
interface IErrorResponse {
    message: string;
    statusCode: number;
    name: string;
    details?: ValidationError[];
}

export const ApiResponse = {
    success: <T>(data: T, message?: string): IApiResponse<T> => ({
        success: true,
        data,
        message
    }),
    error: (error: CustomError | IErrorResponse | string | Error): IApiResponse => {
        if (error instanceof CustomError) {
            return {
                success: false,
                message: `Error: ${error.message}`,
                error: {
                    statusCode: error.statusCode,
                    name: error.name
                }
            };
        }
    

        const customError = new CustomError(
            error instanceof Error ? error.message : String(error),
            500,
            'Error'
        );
        if (typeof error === 'object' && error !== null && 'details' in error) {
            return {
                success: false,
                message: error.message,
                error: {
                    statusCode: error.statusCode,
                    name: error.name,
                    details: error.details
                }
            };
        }
        return {
            success: false,
            message: `Error: ${JSON.stringify(error)}`,
            error: {
                statusCode: customError.statusCode,
                name: customError.name
            }
        };
    }

    
};
