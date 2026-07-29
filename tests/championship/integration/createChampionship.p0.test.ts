import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/api/config', () => ({
    env: {
        IMAGE_NO_FOUND: null,
    },
    Logger: class {
        info() {}
        error() {}
        warn() {}
    },
}));

import { ChampionshipController } from '../../../src/api/controllers/championship/championship.controller';
import type { IUserCustomRequest } from '../../../src/api/interfaces/ICustomrequest';
import { BASE_CREATE_CHAMPIONSHIP_PAYLOAD } from '../helpers/createChampionshipValidationApp';

describe('P0 - Championship creation flow', () => {
    it('persists matchRules received in the create payload', async () => {
        const controller = new ChampionshipController();
        const championshipId = new Types.ObjectId();
        const championship = {
            _id: championshipId,
            status: 'draft',
        };
        const persistedConfiguration = {
            _id: new Types.ObjectId(),
            championshipId,
            matchRules: BASE_CREATE_CHAMPIONSHIP_PAYLOAD.matchRules,
        };

        const createChampionship = vi.fn().mockResolvedValue(championship);
        const updateStatus = vi.fn().mockResolvedValue({
            ...championship,
            status: 'registration',
        });
        const createConfiguration = vi.fn().mockResolvedValue(persistedConfiguration);

        Object.assign(controller as object, {
            championshipService: {
                create: createChampionship,
                updateStatus,
            },
            configurationService: {
                create: createConfiguration,
            },
        });

        const status = vi.fn();
        const json = vi.fn();
        const response = {
            status: status.mockReturnThis(),
            json,
        };
        const request = {
            clientAccount: 'tenant-p0',
            user: { _id: new Types.ObjectId() },
            body: {
                ...BASE_CREATE_CHAMPIONSHIP_PAYLOAD,
            },
        } as unknown as IUserCustomRequest;

        await controller.create(request, response as never);

        expect(createConfiguration).toHaveBeenCalledOnce();
        expect(createConfiguration).toHaveBeenCalledWith(
            'tenant-p0',
            expect.objectContaining({
                matchRules: BASE_CREATE_CHAMPIONSHIP_PAYLOAD.matchRules,
            }),
        );
    });
});
