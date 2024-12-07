import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.config';
import { Logger } from '../config/logger/WinstonLogger';
import { AuthError } from '../errors/AuthError';
interface TokenPayload {
    data: {
        _id: string;
    };
    exp?: number;
    iat?: number;
}

export class TokenService {
    private readonly secret: string;
    private readonly key: Buffer;
    private readonly algorithm = 'aes-192-cbc';
    private readonly iv = Buffer.alloc(16, 0);
    private readonly logger: Logger;

    constructor() {
        this.secret = env.JWT_SECRET;
        this.key = crypto.scryptSync(this.secret, 'salt', 24);
        this.logger = new Logger();
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

    public verifyToken(encryptedToken: string): TokenPayload | null {
        try {
            const decryptedToken = this.decrypt(encryptedToken);
            const decoded = jwt.verify(decryptedToken, this.secret) as TokenPayload;
            return decoded;
        } catch (error) {
            this.logger.error('Error verificando token:', error);
            return null;
        }
    }

    public getUserIdFromToken(encryptedToken: string): string {
        const decoded = this.verifyToken(encryptedToken);
        if (!decoded?.data?._id) {
            throw new AuthError('Token inválido', 401);
        }
        return decoded.data._id;
    }

    private encrypt(text: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
    public decrypt(encryptedText: string): string {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
} 