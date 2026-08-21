import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/config', () => ({
    env: {},
    Logger: class {
        error() {}
        info() {}
        warn() {}
        debug() {}
    },
}));

import Championship from '../../src/api/models/mongoose/championship/championship';
import ChampionshipConfiguration from '../../src/api/models/mongoose/championship/configuration';
import { ChampionshipService } from '../../src/api/services/championship/championship.service';
import { DatabaseHelper } from '../../src/api/utils/database.helper';

interface BasicUpdateDTO {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
}

interface BasicUpdateService {
    updateBasicInfo(
        tenant: string,
        championshipId: string,
        data: BasicUpdateDTO,
    ): Promise<Record<string, unknown>>;
}

const START = new Date('2026-08-10T12:00:00.000Z');
const END = new Date('2026-08-20T12:00:00.000Z');
const DEADLINE = new Date('2026-08-09T12:00:00.000Z');

function installDatabase(
    options: {
        tenant?: string;
        championshipExists?: boolean;
        status?: string;
    } = {},
) {
    const tenant = options.tenant ?? 'tenant-a';
    const championshipId = new Types.ObjectId();
    const championship = {
        _id: championshipId,
        name: 'Original Championship',
        description: 'Original description',
        startDate: START,
        endDate: END,
        status: options.status ?? 'draft',
        courts: [],
        teams: [],
        registrations: [],
    };
    const configuration = {
        _id: new Types.ObjectId(),
        championshipId,
        registrationDeadline: DEADLINE,
    };

    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (model: any, requestedTenant: string) => {
            if (requestedTenant !== tenant) return null;
            if (
                (model as { modelName?: string }).modelName ===
                (Championship as { modelName?: string }).modelName
            ) {
                return options.championshipExists === false
                    ? null
                    : ({ ...championship } as any);
            }
            if (
                (model as { modelName?: string }).modelName ===
                (ChampionshipConfiguration as { modelName?: string }).modelName
            ) {
                return { ...configuration } as any;
            }
            return null;
        },
    );
    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (_model, requestedTenant, _query, update) => {
            if (requestedTenant !== tenant) return null;
            return {
                ...championship,
                ...(update.$set ?? update),
            } as any;
        },
    );

    return { tenant, championshipId, championship, configuration };
}

function update(
    service: ChampionshipService,
    tenant: string,
    championshipId: string,
    data: BasicUpdateDTO & Record<string, unknown>,
) {
    return (service as unknown as BasicUpdateService).updateBasicInfo(
        tenant,
        championshipId,
        data,
    );
}

describe('P0 - Championship basic information update', () => {
    afterEach(() => vi.restoreAllMocks());

    it('updates name and trims it', async () => {
        const state = installDatabase();
        const result = await update(
            new ChampionshipService(),
            state.tenant,
            state.championshipId.toString(),
            { name: '  Updated Championship  ' },
        );
        expect(result.name).toBe('Updated Championship');
    });

    it('updates description', async () => {
        const state = installDatabase();
        const result = await update(
            new ChampionshipService(),
            state.tenant,
            state.championshipId.toString(),
            { description: 'Updated description' },
        );
        expect(result.description).toBe('Updated description');
    });

    it('updates startDate when final date range remains valid', async () => {
        const state = installDatabase();
        const startDate = new Date('2026-08-11T12:00:00.000Z');
        const result = await update(
            new ChampionshipService(),
            state.tenant,
            state.championshipId.toString(),
            { startDate },
        );
        expect(result.startDate).toEqual(startDate);
    });

    it('updates endDate when final date range remains valid', async () => {
        const state = installDatabase();
        const endDate = new Date('2026-08-25T12:00:00.000Z');
        const result = await update(
            new ChampionshipService(),
            state.tenant,
            state.championshipId.toString(),
            { endDate },
        );
        expect(result.endDate).toEqual(endDate);
    });

    it.each([
        ['short name', { name: 'ab' }],
        ['long name', { name: 'a'.repeat(101) }],
        ['long description', { description: 'd'.repeat(501) }],
        [
            'endDate <= startDate',
            { startDate: START, endDate: START },
        ],
        [
            'partial startDate after persisted endDate',
            { startDate: new Date('2026-08-25T12:00:00.000Z') },
        ],
        [
            'startDate <= registrationDeadline',
            { startDate: DEADLINE },
        ],
    ])('rejects %s', async (_label, data) => {
        const state = installDatabase();
        await expect(
            update(
                new ChampionshipService(),
                state.tenant,
                state.championshipId.toString(),
                data,
            ),
        ).rejects.toThrow();
        expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('ignores status and all non-whitelisted fields', async () => {
        const state = installDatabase({ status: 'draft' });
        const result = await update(
            new ChampionshipService(),
            state.tenant,
            state.championshipId.toString(),
            {
                name: 'Allowed Name',
                status: 'completed',
                courts: [new Types.ObjectId()],
                tenant: 'tenant-b',
            },
        );
        expect(result.status).toBe('draft');
        expect(result.courts).toEqual([]);
    });

    it('tenant A cannot update tenant B Championship', async () => {
        const state = installDatabase({ tenant: 'tenant-b' });
        await expect(
            update(
                new ChampionshipService(),
                'tenant-a',
                state.championshipId.toString(),
                { name: 'Forbidden Update' },
            ),
        ).rejects.toThrow('not found');
        expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a missing Championship', async () => {
        const state = installDatabase({ championshipExists: false });
        await expect(
            update(
                new ChampionshipService(),
                state.tenant,
                state.championshipId.toString(),
                { name: 'Missing Championship' },
            ),
        ).rejects.toThrow('not found');
        expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
    });
});
