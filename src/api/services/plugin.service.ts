import { Injectable } from '@decorators/di';
import { Logger } from '../config/logger/WinstonLogger';
import { Plugin } from '../models/mongoose';
import { AuthError } from '../errors/AuthError';

@Injectable()
export class PluginService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async getPlugins(tenant: string): Promise<string[]> {
        try {
            const plugins = await Plugin.byTenant(tenant)
                .find({ status: 'enabled' })
                .select('plugin.path plugin.name');

            if (!plugins) {
                return [];
            }

            // Mapear solo los paths de los plugins
            return plugins.map(plugin => plugin.plugin.path);

        } catch (error) {
            this.logger.error('Error obteniendo plugins:', error);
            throw new AuthError('Error al obtener plugins', 422);
        }
    }
} 