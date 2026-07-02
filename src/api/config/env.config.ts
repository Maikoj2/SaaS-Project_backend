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
    LOG_LEVEL: str({ default: 'info' }),

    // JWT
    JWT_SECRET: str(),
    JWT_EXPIRATION_IN_MINUTES: str({ default: '90' }),
    JWT_REFRESH_SECRET: str(),
    JWT_REFRESH_EXPIRATION: str({ default: '7d' }),

    // Auth
    MAX_LOGIN_ATTEMPTS: num({ default: 5 }),
    BLOCK_TIME_HOURS: num({ default: 2 }),

    // API
    API_PREFIX: str({ default: '/api/v1' }),

    // Crypto
    CRYPTO_SECRET: str(),

    // Email
    SMTP_HOST: str(),
    SMTP_PORT: str(),
    SMTP_SECURE: str(),
    SMTP_USER: str(),
    SMTP_PASS: str(),
    EMAIL_FROM_NAME: str(),
    EMAIL_FROM_ADDRESS: str(),
    COMPANY_NAME: str(),
    FRONTEND_URL: str(),
    FRONTEND_URL_DEV: str(),
    FRONTEND_URL_TENANT: str({ default: 'http://__TENANT__.localhost:3000' }),
    BACKEND_URL: str({ default: 'http://localhost:8000' }),
    MP_MODE: str({ choices: ['sandbox', 'production'], default: 'sandbox' }),
    MP_ACCESS_TOKEN: str({ default: '' }),
    MP_CLIENT_ID: str({ default: '' })
}); 