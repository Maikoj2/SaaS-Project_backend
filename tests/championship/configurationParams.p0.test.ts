import express, {
    type Request,
    type RequestHandler,
    type Response,
} from 'express';
import request from 'supertest';
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

vi.mock('../../src/api/middlewares', async () => {
    const validatorMiddleware = await import(
        '../../src/api/middlewares/auth/validator.middleware'
    );
    return { validate: validatorMiddleware.validate };
});

vi.mock('../../src/api/validators/auth', () => ({
    PasswordValidator: {
        validate: () => ({ isValid: true, errors: [] }),
    },
}));

import { ChampionshipController } from '../../src/api/controllers/championship/championship.controller';
import type { IUserCustomRequest } from '../../src/api/interfaces';
import ChampionshipConfiguration from '../../src/api/models/mongoose/championship/configuration';
import { ChampionshipService } from '../../src/api/services/championship/championship.service';
import { DatabaseHelper } from '../../src/api/utils/database.helper';
import { championshipConfigurationValidators } from '../../src/api/validators/championships/Configuration.validator';

function responseDouble() {
    const json = vi.fn();
    const status = vi.fn().mockReturnThis();
    return { response: { status, json }, status, json };
}

function validationApp(validators: RequestHandler[]) {
    const app = express();
    app.use(express.json());
    app.patch(
        '/championship/:championshipId/configuration/:configurationId',
        validators,
        (_req: Request, res: Response) => {
            res.status(200).json({ success: true });
        },
    );
    app.get(
        '/championship/:championshipId/configuration/:configurationId',
        validators,
        (_req: Request, res: Response) => {
            res.status(200).json({ success: true });
        },
    );
    return app;
}

describe('P0 - ChampionshipConfiguration parameter contract', () => {
    afterEach(() => vi.restoreAllMocks());

    it('GET controller reads req.params.configurationId', async () => {
        const controller = new ChampionshipController();
        const getConfigurationById = vi.fn().mockResolvedValue({ maxTeams: 8 });
        Object.assign(controller as object, {
            championshipService: { getConfigurationById },
        });
        const { response, status } = responseDouble();
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();

        await controller.getChampionshipConfiguration(
            {
                clientAccount: 'tenant-a',
                params: {
                    championshipId,
                    configurationId,
                },
            } as unknown as IUserCustomRequest,
            response as never,
        );

        expect(getConfigurationById).toHaveBeenCalledWith(
            'tenant-a',
            championshipId,
            configurationId,
        );
        expect(status).toHaveBeenCalledWith(200);
    });

    it('PATCH controller reads req.params.configurationId', async () => {
        const controller = new ChampionshipController();
        const updateConfiguration = vi.fn().mockResolvedValue({ maxTeams: 12 });
        Object.assign(controller as object, {
            championshipService: { updateConfiguration },
        });
        const { response, status } = responseDouble();
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();

        await controller.updateChampionshipConfiguration(
            {
                clientAccount: 'tenant-a',
                params: {
                    championshipId,
                    configurationId,
                },
                body: { maxTeams: 12 },
            } as unknown as IUserCustomRequest,
            response as never,
        );

        expect(updateConfiguration).toHaveBeenCalledWith(
            'tenant-a',
            championshipId,
            configurationId,
            { maxTeams: 12 },
        );
        expect(status).toHaveBeenCalledWith(200);
    });

    it.each([
        ['championshipId', 'invalid', new Types.ObjectId().toString()],
        ['configurationId', new Types.ObjectId().toString(), 'invalid'],
    ])('PATCH rejects invalid %s', async (_field, championshipId, configurationId) => {
        const app = validationApp(
            championshipConfigurationValidators
                .updateChampionshipConfiguration as RequestHandler[],
        );
        const response = await request(app)
            .patch(
                `/championship/${championshipId}/configuration/${configurationId}`,
            )
            .send({});

        expect(response.status).toBe(422);
    });

    it.each([
        ['championshipId', 'invalid', new Types.ObjectId().toString()],
        ['configurationId', new Types.ObjectId().toString(), 'invalid'],
    ])('GET rejects invalid %s', async (_field, championshipId, configurationId) => {
        const app = validationApp(
            championshipConfigurationValidators
                .getChampionshipConfiguration as RequestHandler[],
        );
        const response = await request(app).get(
            `/championship/${championshipId}/configuration/${configurationId}`,
        );

        expect(response.status).toBe(422);
    });

    it.each([
        [
            'PATCH',
            championshipConfigurationValidators.updateChampionshipConfiguration,
        ],
        [
            'GET',
            championshipConfigurationValidators.getChampionshipConfiguration,
        ],
    ])('%s accepts valid championshipId and configurationId', async (method, validators) => {
        const app = validationApp(validators as RequestHandler[]);
        const path =
            `/championship/${new Types.ObjectId().toString()}` +
            `/configuration/${new Types.ObjectId().toString()}`;
        const response =
            method === 'PATCH'
                ? await request(app).patch(path).send({})
                : await request(app).get(path);

        expect(response.status).toBe(200);
    });

    it('tenant B cannot read tenant A configuration', async () => {
        vi.spyOn(DatabaseHelper, 'findOneWithRelations').mockResolvedValue(null);
        const championshipId = new Types.ObjectId().toString();
        const result = await new ChampionshipService().getConfigurationById(
            'tenant-b',
            championshipId,
            new Types.ObjectId().toString(),
        );

        expect(result).toBeNull();
        expect(DatabaseHelper.findOneWithRelations).toHaveBeenCalledWith(
            ChampionshipConfiguration,
            'tenant-b',
            expect.objectContaining({ championshipId }),
            expect.any(Object),
        );
    });

    it('tenant B cannot update tenant A configuration', async () => {
        vi.spyOn(DatabaseHelper, 'findOne').mockResolvedValue(null);
        const update = vi.spyOn(DatabaseHelper, 'update');
        const championshipId = new Types.ObjectId().toString();

        await expect(
            new ChampionshipService().updateConfiguration(
                'tenant-b',
                championshipId,
                new Types.ObjectId().toString(),
                { maxTeams: 12 },
            ),
        ).rejects.toThrow('not found');
        expect(update).not.toHaveBeenCalled();
    });

    it('GET returns a configuration when it belongs to the championship in the path', async () => {
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();
        const configuration = { _id: configurationId, championshipId, maxTeams: 8 };
        vi.spyOn(DatabaseHelper, 'findOneWithRelations').mockResolvedValue(
            configuration as never,
        );

        const result = await new ChampionshipService().getConfigurationById(
            'tenant-a',
            championshipId,
            configurationId,
        );

        expect(result).toBe(configuration);
        expect(DatabaseHelper.findOneWithRelations).toHaveBeenCalledWith(
            ChampionshipConfiguration,
            'tenant-a',
            { _id: configurationId, championshipId },
            expect.any(Object),
        );
    });

    it('GET does not expose a same-tenant configuration from another championship', async () => {
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();
        vi.spyOn(DatabaseHelper, 'findOneWithRelations').mockImplementation(
            async (_model, _tenant, query) =>
                'championshipId' in query ? null : ({ _id: configurationId } as never),
        );

        const result = await new ChampionshipService().getConfigurationById(
            'tenant-a',
            championshipId,
            configurationId,
        );

        expect(result).toBeNull();
    });

    it('PATCH updates a configuration when it belongs to the championship in the path', async () => {
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();
        vi.spyOn(DatabaseHelper, 'findOne').mockResolvedValue({
            _id: new Types.ObjectId(configurationId),
            championshipId: new Types.ObjectId(championshipId),
        } as never);
        const update = vi.spyOn(DatabaseHelper, 'update').mockResolvedValue({
            maxTeams: 12,
        } as never);

        const result = await new ChampionshipService().updateConfiguration(
            'tenant-a',
            championshipId,
            configurationId,
            { maxTeams: 12 },
        );

        expect(result).toEqual({ maxTeams: 12 });
        expect(DatabaseHelper.findOne).toHaveBeenCalledWith(
            ChampionshipConfiguration,
            'tenant-a',
            { _id: configurationId, championshipId },
        );
    });

    it('PATCH does not modify a same-tenant configuration from another championship', async () => {
        const championshipId = new Types.ObjectId().toString();
        const configurationId = new Types.ObjectId().toString();
        vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
            async (_model, _tenant, query) =>
                'championshipId' in query ? null : ({ _id: configurationId } as never),
        );
        const update = vi.spyOn(DatabaseHelper, 'update');

        await expect(
            new ChampionshipService().updateConfiguration(
                'tenant-a',
                championshipId,
                configurationId,
                { maxTeams: 12 },
            ),
        ).rejects.toThrow('not found');
        expect(update).not.toHaveBeenCalled();
    });
});
