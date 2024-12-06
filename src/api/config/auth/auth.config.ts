import { env } from "../env.config";

export const authConfig = {
    MAX_LOGIN_ATTEMPTS: Number(env.MAX_LOGIN_ATTEMPTS || 5),
    BLOCK_TIME: (Number(env.BLOCK_TIME_HOURS || 2) * 60 * 60 * 1000), // Convertir horas a ms
}; 