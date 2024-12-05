import { Router } from "express";
import fs from 'fs';
import path from "path";
import { Logger } from '../config';

export class RouteLoader {
    private readonly router: Router;
    private readonly logger: Logger;
    private readonly routesPath: string;

    constructor() {
        this.router = Router();
        this.logger = new Logger();
        this.routesPath = __dirname;
    }

    private removeExtension(fileName: string): string {
        return fileName.replace(/\.[^/.]+$/, "");
    }

    private loadRouteFile(dirName: string, file: string): void {
        try {
            const routePath = path.join(this.routesPath, dirName, file);
            const routeName = this.removeExtension(file);
            
            // Importar la ruta
            const route = require(routePath).default;
            
            // Registrar la ruta
            this.router.use(`/${routeName}`, route);
            
            this.logger.info(`Ruta cargada: /${routeName}`, {
                file: routePath
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error(`Error cargando ruta: ${file}`, {
                error: errorMessage,
                path: path.join(dirName, file)
            });
        }
    }

    public loadRoutes(): Router {
        try {
            // Leer directorios en la carpeta de rutas
            fs.readdirSync(this.routesPath)
                .filter(dir => {
                    // Ignorar archivos, solo procesar directorios
                    const dirPath = path.join(this.routesPath, dir);
                    return fs.statSync(dirPath).isDirectory();
                })
                .forEach(dir => {
                    // Leer archivos de cada directorio
                    const dirPath = path.join(this.routesPath, dir);
                    fs.readdirSync(dirPath)
                        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
                        .forEach(file => this.loadRouteFile(dir, file));
                });

            this.logger.info('Todas las rutas cargadas exitosamente');
            return this.router;

        } catch (error) {
            this.logger.error('Error cargando rutas:', error);
            throw error;
        }
    }
}

// Exportar instancia del router con rutas cargadas
export default new RouteLoader().loadRoutes();