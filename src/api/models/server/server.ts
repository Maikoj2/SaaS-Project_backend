import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DatabaseConnection, Logger } from '../../config';
import { RouteLoader } from '../../routes';
import { errorMiddleware } from '../../middlewares';
import { env } from '../../config/env.config';
import '../../config/passport/passport'
import passport from 'passport';
import { seedGameFormats } from '../../seeds/gameFormats.seed';
import { seedClubs } from '../../seeds/clubs.seed';
import { PluginLoader } from '../../plugin';
import { seedCourts } from '../../seeds/courts.seed';
import { seedMatchFormats } from '../../seeds/MatchFormat.seed';



export class Server {
    private readonly app: Application;
    private readonly port: string;
    private readonly logger: Logger;
    private readonly db: DatabaseConnection;
    private routeLoader: RouteLoader;
    private server: any; // Para almacenar la instancia del servidor HTTP
    private pluginLoader: PluginLoader;

    constructor() {
        this.app = express();
        this.port = env.PORT || '8000';
        this.logger = new Logger();
        this.db = new DatabaseConnection();
        this.routeLoader = new RouteLoader();

        this.setupMiddlewares();
        this.setupRoutes();
        this.setupErrorHandling();
        this.pluginLoader = new PluginLoader();
    }

    private setupMiddlewares(): void {
        // Seguridad y parsers
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        // Inicializar Passport
        this.app.use(passport.initialize());


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
    private async setupPlugins(): Promise<void> {
        try {
            // Asumiendo que tienes un tenant por defecto o lo obtienes de alguna configuración
            const defaultTenant = 'miapp';
            await this.pluginLoader.loadPlugins(defaultTenant);

            const loadedPlugins = this.pluginLoader.getLoadedPlugins();
            this.logger.info('Plugins cargados:', loadedPlugins);
        } catch (error) {
            this.logger.error('Error cargando plugins:', error);
            throw error;
        }
    }


    public async start(): Promise<void> {
        try {
            // Conectar a la base de datos
            await this.db.connect();
            this.logger.info('Conexión a base de datos establecida');
            // Inicializar datos básicos
            await seedGameFormats('miapp');
            this.logger.info('Formatos de juego inicializados');
            await seedClubs('miapp');
            this.logger.info('Clubs inicializados');
            await seedCourts('miapp');
            this.logger.info('Courts inicializados');
            await seedMatchFormats('miapp');
            this.logger.info('Match formats inicializados');
            // Cargar plugins (añade esto)
            await this.setupPlugins();
            this.logger.info('Plugins inicializados correctamente');

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
    // Método helper para acceder a los plugins (opcional)
    public getPluginLoader(): PluginLoader {
        return this.pluginLoader;
    }
} 