import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';

import { AuthError } from '../errors/AuthError';
import { Injectable } from '@decorators/di';
import { decrypt, encrypt } from '../utils';

interface TokenPayload {
    userId: string;
    type: 'access' | 'refresh';
}

@Injectable()
export class TokenService {
    private readonly ACCESS_TOKEN_EXPIRY = '15m';
    private readonly REFRESH_TOKEN_EXPIRY = '7d';

    public generateToken(userId: string): string {
        const tokens = this.generateTokens(userId);
        
        // Encriptar los tokens en un solo string como antes
        const tokenData = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };

        return encrypt(JSON.stringify(tokenData));
    }

    public  getUserIdFromToken(encryptedToken: string): string {
        try {
            // Desencriptar el token
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            // Verificar el access token
            const decoded = jwt.verify(tokens.accessToken, env.JWT_SECRET) as TokenPayload;
            return decoded.userId;
        } catch (error) {
            throw new AuthError('Token inválido o expirado', 401);
        }
    }

    private generateTokens(userId: string) {
        return {
            accessToken: jwt.sign(
                { userId, type: 'access' } as TokenPayload,
                env.JWT_SECRET,
                { expiresIn: this.ACCESS_TOKEN_EXPIRY }
            ),
            refreshToken: jwt.sign(
                { userId, type: 'refresh' } as TokenPayload,
                env.JWT_REFRESH_SECRET,
                { expiresIn: this.REFRESH_TOKEN_EXPIRY }
            )
        };
    }
} 