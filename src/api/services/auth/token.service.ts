import jwt, { verify } from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { CustomError } from '../../errors';
import { Injectable } from '@decorators/di';
import { decrypt, encrypt } from '../../utils';

export interface TokenPayload {
    userId: string;
    tenant: string;
    type: 'access' | 'refresh';
}

@Injectable()
export class TokenService {
    private readonly ACCESS_TOKEN_EXPIRY = /^\d+$/.test(env.JWT_EXPIRATION_IN_MINUTES)
        ? `${env.JWT_EXPIRATION_IN_MINUTES}m`
        : env.JWT_EXPIRATION_IN_MINUTES;
    private readonly REFRESH_TOKEN_EXPIRY = env.JWT_REFRESH_EXPIRATION;

    public generateToken(userId: string, tenant: string): string {
        const tokens = this.generateTokens(userId, tenant);
        
        // Encriptar los tokens en un solo string como antes
        const tokenData = {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        };

        return encrypt(JSON.stringify(tokenData));
    }

    public getUserIdFromToken(encryptedToken: string): string {
        try {
            // Desencriptar el token
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            // Verificar el access token
            const decoded = jwt.verify(tokens.accessToken, env.JWT_SECRET) as TokenPayload;
            return decoded.userId;
        } catch (error) {
            throw new CustomError(error instanceof Error ? error.message : 'Error getting user id from token', 401, 'TokenServiceError');
        }
    }

    /**
     * Decrypts the token payload and verifies the refresh token.
     * Returns the decoded payload if valid.
     */
    public getPayloadFromRefreshToken(encryptedToken: string): TokenPayload {
        try {
            // Desencriptar el token
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            // Verificar el refresh token
            const decoded = jwt.verify(tokens.refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
            if (decoded.type !== 'refresh') {
                throw new CustomError('Invalid refresh token type', 401, 'TokenServiceError');
            }
            return decoded;
        } catch (error) {
            throw new CustomError(error instanceof Error ? error.message : 'Invalid refresh token', 401, 'TokenServiceError');
        }
    }

    private generateTokens(userId: string, tenant: string) {
        return {
            accessToken: jwt.sign(
                { userId, tenant, type: 'access' } as TokenPayload,
                env.JWT_SECRET,
                { expiresIn: this.ACCESS_TOKEN_EXPIRY }
            ),
            refreshToken: jwt.sign(
                { userId, tenant, type: 'refresh' } as TokenPayload,
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
                throw new CustomError('Invalid refresh token', 401, 'TokenServiceError');
            }

            // Generar nuevos tokens
            const newTokens = this.generateTokens(decoded.userId, decoded.tenant);
            
            // Encriptar y retornar
            return encrypt(JSON.stringify(newTokens));

        } catch {
            throw new CustomError('Invalid refresh token', 401, 'TokenServiceError');
        }
    }

    public verifyAccessToken(encryptedToken: string): TokenPayload {
        try {
            const decrypted = decrypt(encryptedToken);
            const tokens = JSON.parse(decrypted);
            
            const decoded = verify(
                tokens.accessToken, 
                env.JWT_SECRET
            ) as TokenPayload;

            if (decoded.type !== 'access') {
                throw new CustomError('Invalid access token type', 401, 'TokenServiceError');
            }
            return decoded;
        } catch {
            throw new CustomError('Invalid access token', 401, 'TokenServiceError');
        }
    }

    public verifyResetToken(token: string): string {
        try {
            const decoded = verify(token, env.JWT_SECRET) as { userId: string };
            return decoded.userId;
        } catch {
            throw new CustomError('Invalid or expired token', 401, 'TokenServiceError');
        }
    }
}