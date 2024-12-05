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

    error: (message: string, error?: any): IApiResponse => ({
        success: false,
        message,
        error
    })
};
