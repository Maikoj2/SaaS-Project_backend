import { Injectable } from '@decorators/di';
import { setting } from '../../models/mongoose';
import { Logger } from '../../config/logger/WinstonLogger';
import { DatabaseHelper } from '../../utils/database.helper';


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
        return await DatabaseHelper.create(setting, data.tenant, {
            name: data.name,
            currency: null,
            logo: null,
            owner: data.ownerId
        });
    }

    public async getSettings(tenant: string) {
        return await setting.byTenant(tenant)
            .findOne({}, 'currency logo name tenantId plugins language');
    }
} 