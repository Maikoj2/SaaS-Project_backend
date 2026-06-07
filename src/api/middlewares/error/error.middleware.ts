import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';
import { env } from '../../config/env.config';

// 1. Singleton/Instanciación única del Logger (Evita inicializaciones redundantes)
const logger = new Logger();

export const errorMiddleware = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 2. Si las cabeceras ya fueron enviadas, delegar al manejador por defecto de Express para evitar caídas fatales
    if (res.headersSent) {
        return next(error);
    }
    
    logger.error('Error no manejado:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
    });

    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: env.NODE_ENV === 'development' ? error.message : undefined
    });
};
