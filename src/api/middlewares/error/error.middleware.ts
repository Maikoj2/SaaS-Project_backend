import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const logger = new Logger();
    
    logger.error('Error no manejado:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};
