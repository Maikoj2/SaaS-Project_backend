import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { env } from '../../config/env.config';


import { BaseError } from '../../errors/baseError';
import { AuthError } from '../../errors/AuthError';
import { CustomError } from '../../errors/customError';
// 1. Singleton/Instanciación única del Logger (Evita inicializaciones redundantes)
const logger = new Logger();

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (res.headersSent) {
        return next(error);
    }

    const isOperational =
        error instanceof BaseError ||
        error instanceof AuthError ||
        error instanceof CustomError;

    const statusCode =
        (error as any)?.statusCode && Number.isInteger((error as any).statusCode)
            ? (error as any).statusCode
            : 500;

    if (!isOperational || statusCode >= 500) {
        logger.error('Error no manejado:', {
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method
        });
    } else {
        logger.warn('Error operacional:', {
            error: error.message,
            statusCode,
            path: req.path,
            method: req.method
        });
    }

    res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 500 && env.NODE_ENV === 'production'
                ? 'Error interno del servidor'
                : error.message,
    });
};
