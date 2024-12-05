import dotenv from 'dotenv';
import { DatabaseConnection, Logger } from './api/config';
import { Server } from './api/models';



async function bootstrap() {
    try {
        dotenv.config();
        const logger = new Logger();
        const db = new DatabaseConnection();
        await db.connect();
        
        const server = new Server();
        await server.start();
        
        setupGracefulShutdown(server, db, logger);
    } catch (error) {
        const logger = new Logger();
        logger.error('Error fatal iniciando aplicación:', error);
        process.exit(1);
    }
}

function setupGracefulShutdown(
    server: Server, 
    db: DatabaseConnection, 
    logger: Logger
): void {
    const shutdown = async (signal: string) => {
        logger.info(`${signal} recibido. Iniciando apagado graceful...`);
        
        try {
            // Cerrar servidor
            await server.close();
            logger.info('Servidor cerrado');

            // Cerrar conexión a base de datos
            await db.closeConnection();
            logger.info('Conexión a base de datos cerrada');

            process.exit(0);
        } catch (error) {
            logger.error('Error durante el apagado:', error);
            process.exit(1);
        }
    };

    // Capturar señales de terminación
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
        logger.error('Error no capturado:', error);
        shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
        logger.error('Promesa rechazada no manejada:', reason);
        shutdown('UNHANDLED_REJECTION');
    });
}

// Iniciar aplicación
bootstrap().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
});