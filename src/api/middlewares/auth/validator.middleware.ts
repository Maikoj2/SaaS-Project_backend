import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

import { ApiResponse } from '../../responses';
import { CustomError } from '../../errors';


export const validate = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json(
            ApiResponse.error( {
                message: 'Error de validación',
                statusCode: 422,
                name: 'ValidationError',
                details: errors.array().map((err:any) => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            } as any )
        );
    }

    if (req.body.email) {
        req.body.email = req.body.email.toLowerCase();
    }

    return next();
}; 