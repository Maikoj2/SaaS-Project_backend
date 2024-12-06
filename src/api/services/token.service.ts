import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.config';

export class TokenService {
    private readonly secret: string;
    private readonly key: Buffer;
    private readonly algorithm = 'aes-192-cbc';
    private readonly iv = Buffer.alloc(16, 0);

    constructor() {
        this.secret = env.JWT_SECRET || 'default-secret-key';
        this.key = crypto.scryptSync(this.secret, 'salt', 24);
    }

    public generateToken(userId: string): string {
        const expiration = Math.floor(Date.now() / 1000) + 60 * (Number(process.env.JWT_EXPIRATION_IN_MINUTES) || 60);
        
        const token = jwt.sign(
            {
                data: { _id: userId },
                exp: expiration
            },
            this.secret
        );

        return this.encrypt(token);
    }

    private encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
} 