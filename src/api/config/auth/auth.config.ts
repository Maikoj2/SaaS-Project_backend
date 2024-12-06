export const authConfig = {
    MAX_LOGIN_ATTEMPTS: Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
    BLOCK_TIME: (Number(process.env.BLOCK_TIME_HOURS || 2) * 60 * 60 * 1000), // Convertir horas a ms
}; 