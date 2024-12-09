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

    public async refreshTokens(encryptedToken: string): Promise<string> {
        try {
            // Desencriptar tokens actuales
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            // Verificar refresh token
            const decoded = jwt.verify(
                tokens.refreshToken, 
                env.JWT_REFRESH_SECRET
            ) as TokenPayload;

            if (decoded.type !== 'refresh') {
                throw new AuthError('Invalid refresh token', 401);
            }

            // Generar nuevos tokens
            const newTokens = this.generateTokens(decoded.userId);
            
            // Encriptar y retornar
            return encrypt(JSON.stringify(newTokens));

        } catch (error) {
            throw new AuthError('Invalid refresh token', 401);
        }
    }

    public verifyAccessToken(encryptedToken: string): TokenPayload {
        try {
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            return jwt.verify(
                tokens.accessToken, 
                env.JWT_SECRET
            ) as TokenPayload;
        } catch (error) {
            throw new AuthError('Invalid access token', 401);
        }
    }
} 