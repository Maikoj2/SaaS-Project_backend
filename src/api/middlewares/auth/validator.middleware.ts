import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';

import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';

interface ValidationErrorWithArray extends Error {
    array(): ValidationError[];
}

export const validate = (req: Request, res: Response, next: NextFunction) => {
    try {
        validationResult(req).throw();

        if (req.body.email) {
            req.body.email = req.body.email.toLowerCase();
        }

        return next();
    } catch (error) {
        const logger = new Logger();
        logger.error('Error de validación:', error);

        if (error instanceof Error) {
            return res.status(422).json(
                ApiResponse.error('Error de validación', 
                    'array' in error ? (error as ValidationErrorWithArray).array() : error.message
                )
            );
        }

        return res.status(422).json(
            ApiResponse.error('Error de validación')
        );
    }
}; 