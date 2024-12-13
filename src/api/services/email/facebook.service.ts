import { Injectable } from '@decorators/di';
import passport from 'passport';
import { Request, Response } from 'express';
import { Logger } from '../../config/logger/WinstonLogger';

@Injectable()
export class FacebookService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public authenticate(req: Request, res: Response, tenant: string): void {
        // Establecer cookie de tenant
        res.cookie('tenant', tenant, {
            expires: new Date(Date.now() + 9999),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        // Iniciar autenticación de Facebook
        passport.authenticate('facebook', {
            scope: ['public_profile', 'email']
        })(req, res);
    }
} 