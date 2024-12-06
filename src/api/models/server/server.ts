import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DatabaseConnection, Logger } from '../../config';
import { RouteLoader } from '../../routes';
import { errorMiddleware } from '../../middlewares';
import { env } from '../../config/env.config';



export class Server {
    private readonly app: Application;
    private readonly port: string;
    private readonly logger: Logger;
    private readonly db: DatabaseConnection;
    private routeLoader: RouteLoader;
    private server: any; // Para almacenar la instancia del servidor HTTP

    constructor() {
        this.app = express();
        this.port = env.PORT || '8000';
        this.logger = new Logger();
        this.db = new DatabaseConnection();
        this.routeLoader = new RouteLoader();

        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    private setupMiddlewares(): void {
        // Seguridad y parsers
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Archivos estáticos
        this.app.use(express.static('public'));

        // Logging de requests
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.url}`, {
                body: req.body,
                query: req.query,
                ip: req.ip
            });
            next();
        });
    }

    private setupRoutes(): void {
        this.app.use(env.API_PREFIX, this.routeLoader.loadRoutes());
        
        // Manejo de rutas no encontradas
        this.app.use('*', (req, res) => {
            this.logger.warn(`Ruta no encontrada: ${req.originalUrl}`);
            res.status(404).json({
                success: false,
                message: 'Ruta no encontrada'
            });
        });
    }

    private setupErrorHandling(): void {
        this.app.use(errorMiddleware);
    }

    public async start(): Promise<void> {
        try {
            // Conectar a la base de datos
            await this.db.connect();
            this.logger.info('Conexión a base de datos establecida');

            // Iniciar servidor
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Servidor corriendo en puerto ${this.port}`);
            });

            // Manejo de señales de terminación
            this.setupGracefulShutdown();

        } catch (error) {
            this.logger.error('Error iniciando servidor:', error);
            process.exit(1);
        }
    }

    private setupGracefulShutdown(): void {
        process.on('SIGTERM', async () => {
            await this.shutdown('SIGTERM');
        });

        process.on('SIGINT', async () => {
            await this.shutdown('SIGINT');
        });
    }

    private async shutdown(signal: string): Promise<void> {
        this.logger.info(`${signal} recibido. Iniciando apagado graceful...`);

        try {
            // Cerrar conexión a base de datos
            await this.db.closeConnection();
            this.logger.info('Conexión a base de datos cerrada');

            // Cerrar servidor
            process.exit(0);
        } catch (error) {
            this.logger.error('Error durante el apagado:', error);
            process.exit(1);
        }
    }

    public getApp(): Application {
        return this.app;
    }

    public async close(): Promise<void> {
        if (this.server) {
            await new Promise((resolve) => {
                this.server.close(resolve);
            });
        }
    }
} 