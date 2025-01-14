import { Injectable } from '@decorators/di';
import { Logger } from '../../config/logger/WinstonLogger';

import { CustomError  } from '../../errors';
import { DatabaseHelper } from '../../utils/database.helper';
import { Types } from 'mongoose';
import { Plugin } from '../../models';
import PluginSetting from '../../models/mongoose/plugins/pluginsettings';

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
            return plugins.map((plugin:any) => plugin.plugin.path);

        } catch (error) {
            this.logger.error('Error obteniendo plugins:', error);
            throw new CustomError (error instanceof Error ? error.message : 'Error getting plugins', 422, 'PluginServiceError');
        }
    }

    public async activePlugins(plugins: string[], tenant: string): Promise<void> {
        try {
            // Buscar plugins por nombre
            const list = await DatabaseHelper.find(Plugin,{
                name: { $in: plugins }
            }) || [];

            // Activar cada plugin
            await Promise.all(list.map(async (plugin:any) => {
                await this.pluginSetting(plugin, tenant);
            }));

            console.log('Plugins activated:', list);
        } catch (error) {
            throw new CustomError (error instanceof Error ? error.message : 'Error activating plugins', 500, 'PluginServiceError');
        }
    }
    private async pluginSetting(plugin: any, tenant: string): Promise<void> {
        try {
            if (!plugin || !tenant) {
                throw new CustomError ('Plugin or tenant not provided', 400);
            }
    
            await DatabaseHelper.findOneAndUpdate(
                PluginSetting,
                tenant,
                { 'plugin._id': new Types.ObjectId(plugin._id) },
                { plugin },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            );
        } catch (error) {
            throw new CustomError (error instanceof Error ? error.message : `Error setting plugin ${plugin?.name}`, 500, 'PluginServiceError');
        }
    }
} 