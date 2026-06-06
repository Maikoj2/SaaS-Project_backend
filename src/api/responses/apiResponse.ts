import { AuthError } from "../errors";

interface IApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: any;
}

export interface IApiError {
    statusCode?: number;
    name?: string;
    details?: any[];
    message?: string;
}

export const ApiResponse = {
    success: <T>(data: T, message?: string): IApiResponse<T> => ({
        success: true,
        data,
        message
    }),

    error: (error: AuthError | IApiError | string): IApiResponse => {
        if (error instanceof AuthError) {
            return {
                success: false,
                message: error.message,
                error: {
                    statusCode: error.statusCode,
                    name: error.name
                }
            };
        }
        if (typeof error === 'object' && error !== null) {
            return {
                success: false,
                message: error.message || 'Error',
                error: {
                    statusCode: error.statusCode || 500,
                    name: error.name || 'Error',
                    details: error.details
                }
            };
        }
        return {
            success: false,
            message: error,
            error: {
                statusCode: 500,
                name: 'Error'
            }
        };
    }
};
