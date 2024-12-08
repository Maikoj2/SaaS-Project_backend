import { config } from 'dotenv';
import { cleanEnv, str, num, email, url } from 'envalid';

config();

export const env = cleanEnv(process.env, {
    // Server
    PORT: str({ default: '8000' }),
    NODE_ENV: str({ choices: ['development', 'production', 'test'] }),

    // Database
    DB_URI: str(),
    DB_NAME: str(),
    
    // logger
    LOG_LEVEL: str({default: 'info'}),

    // JWT
    JWT_SECRET: str(),
    JWT_EXPIRATION_IN_MINUTES: str({ default: '60' }),
    JWT_REFRESH_SECRET: str(),

    // Auth
    MAX_LOGIN_ATTEMPTS: num({ default: 5 }),
    BLOCK_TIME_HOURS: num({ default: 2 }),

    // API
    API_PREFIX: str({ default: '/api/v1' }),

    // Crypto
    CRYPTO_SECRET: str()
}); 