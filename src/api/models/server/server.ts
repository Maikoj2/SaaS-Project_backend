import express, { Application } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DatabaseConnection, Logger } from '../../config';
import { RouteLoader } from '../../routes';
import { errorMiddleware } from '../../middlewares';
import { env } from '../../config/env.config';
import '../../config/passport/passport'
import passport from 'passport';



export class Server {
    private readonly app: Application;
    private readonly port: string;
    private readonly logger: Logger;
    private routeLoader: RouteLoader;
    private server: any; // Para almacenar la instancia del servidor HTTP

    constructor() {
        this.app = express();
        this.port = env.PORT || '8000';
        this.logger = new Logger();
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

        // Inicializar Passport
        this.app.use(passport.initialize());


        // Archivos estáticos
        this.app.use(express.static('public'));

        // Logging de requests
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.url}`, {
                body: req.body,  //borrar luego no lo puedo dejar aqui
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
            // Iniciar servidor
            this.server = this.app.listen(this.port, () => {
                this.logger.info(`Servidor corriendo en puerto ${this.port}`);
            });

        } catch (error) {
            this.logger.error('Error iniciando servidor:', error);
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