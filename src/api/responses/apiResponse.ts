import { AuthError } from "../errors";

interface IApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: any;
}

export const ApiResponse = {
    success: <T>(data: T, message?: string): IApiResponse<T> => ({
        success: true,
        data,
        message
    }),

    error: (error: AuthError | string): IApiResponse => {
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
