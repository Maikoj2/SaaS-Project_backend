import fs from 'fs';
import path from 'path';

import { Logger } from '../config/logger/WinstonLogger';
import { DatabaseHelper } from '../utils/database.helper';
import { IPluginDocument, Plugin } from '../models';

export class PluginLoader {
    private routesPath: string;
    private loadedPlugins: string[];
    private logger: Logger;

    constructor() {
        this.routesPath = path.join(__dirname);
        this.loadedPlugins = [];
        this.logger = new Logger();
    }

    private async installPlugin(file: string, tenant: string): Promise<boolean> {
        try {
            const data = await fs.promises.readFile(
                path.join(this.routesPath, file, 'info.json'),
                'utf8'
            );

            const pluginInfo = JSON.parse(data);

            const pluginData = {
                name: pluginInfo.name,
                description: pluginInfo.description,
                path: pluginInfo.path,
                icon: pluginInfo.icon,
                video: pluginInfo.video,
                features: pluginInfo.features || {},
                periodTry: pluginInfo.periodTry || 0
            };

            await DatabaseHelper.findOneAndUpdate(
                Plugin,
                tenant,
                { path: pluginInfo.path },
                pluginData,
                { upsert: true, new: true }
            );

            return true;
        } catch (error) {
            this.logger.error(`Error installing plugin ${file}:`, error);
            return false;
        }
    }

    public async loadPlugins(tenant: string): Promise<void> {
        try {
            const files = await fs.promises.readdir(this.routesPath);

            for (const file of files) {
                const filePath = path.join(this.routesPath, file);
                const isDirectory = (await fs.promises.lstat(filePath)).isDirectory();

                if (isDirectory) {
                    const success = await this.installPlugin(file, tenant);
                    if (success) {
                        require(path.join(filePath, 'index.js'));
                        this.loadedPlugins.push(file);
                        this.logger.info(`Plugin ${file} loaded successfully for tenant ${tenant}`);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error loading plugins:', error);
        }
    }

    public getLoadedPlugins(): string[] {
        return this.loadedPlugins;
    }

    public async findPluginById(id: string, tenant: string): Promise<IPluginDocument | null> {
        try {
            const plugin = await DatabaseHelper.findById(Plugin, tenant, id);
            return plugin;
        } catch (error) {
            this.logger.error('Error finding plugin:', error);
            throw error;
        }
    }

    public async getActivePlugins(_id: string, tenant: string): Promise<IPluginDocument[]> {
        try {
            return await DatabaseHelper.find(
                Plugin,
                tenant,
                { _id: _id, deleted: false }
            );
        } catch (error) {
            this.logger.error('Error getting active plugins:', error);
            throw error;
        }
    }
}