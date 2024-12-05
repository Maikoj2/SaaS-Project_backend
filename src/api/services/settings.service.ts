import { Injectable } from '@decorators/di';
import { setting } from '../models/mongoose';
import { Logger } from '../config/logger/WinstonLogger';

@Injectable()
export class SettingsService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async findByTenant(tenant: string) {
        return await setting.byTenant(tenant).findOne({});
    }

    public async createSettings(data: { name: string; tenant: string; ownerId: string }) {
        const model = setting.byTenant(data.tenant);
        const settings = new model({
            name: data.name,
            owner: data.ownerId
        });
        return await settings.save();
    }

    public async getSettings(tenant: string) {
        return await setting.byTenant(tenant)
            .findOne({}, 'currency logo name tenantId plugins language');
    }
} 