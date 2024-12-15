import { Injectable } from '@decorators/di';

import { Logger } from '../../config/logger/WinstonLogger';
import { DatabaseHelper } from '../../utils/database.helper';
import Settings from '../../models/mongoose/setting/setting';


@Injectable()
export class SettingsService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async findByTenant(tenant: string) {
        return await Settings.byTenant(tenant).findOne({});
    }

    public async createSettings(data: { name: string; tenant: string; ownerId: string }) {
        return await DatabaseHelper.create(Settings, data.tenant, {
            name: data.name,
            currency: null,
            logo: null,
            owner: data.ownerId
        });
    }

    public async getSettings(tenant: string) {
        return await Settings.byTenant(tenant)
            .findOne({}, 'currency logo name tenantId plugins language');
    }
} 