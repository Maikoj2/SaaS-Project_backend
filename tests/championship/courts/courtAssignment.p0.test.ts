import express, { type Request, type RequestHandler, type Response } from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/api/config', () => ({
    env: {},
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../../src/api/config/logger/WinstonLogger', () => ({
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../../src/api/middlewares', async () => {
    const validatorMiddleware = await import(
        '../../../src/api/middlewares/auth/validator.middleware'
    );
    return { validate: validatorMiddleware.validate };
});

vi.mock('../../../src/api/validators/auth', () => ({
    PasswordValidator: {
        validate: () => ({ isValid: true, errors: [] }),
    },
}));

import Court from '../../../src/api/models/mongoose/championship/court';
import Championship from '../../../src/api/models/mongoose/championship/championship';
import Match from '../../../src/api/models/mongoose/championship/match';
import { CourtService } from '../../../src/api/services/championship/court.service';
import { DatabaseHelper } from '../../../src/api/utils/database.helper';
import { validateCourt } from '../../../src/api/validators/championships/court.validator';

type CourtStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

interface StoredCourt {
    _id: Types.ObjectId;
    tenant: string;
    name: string;
    status: CourtStatus;
    currentChampionshipId?: Types.ObjectId | null;
}

interface StoredChampionship {
    _id: Types.ObjectId;
    tenant: string;
    courts: Types.ObjectId[];
}

interface StoredMatch {
    tenant: string;
    championshipId: Types.ObjectId;
    status: 'scheduled' | 'in_progress' | 'finished' | 'walkover' | 'cancelled';
}

interface DatabaseOptions {
    failChampionshipUpdate?: 'return-null' | 'throw';
    failCourtUpdate?: boolean;
    partialCourtUpdate?: boolean;
}

function id() {
    return new Types.ObjectId();
}

function sameId(left: unknown, right: unknown) {
    return String(left) === String(right);
}

function modelName(model: unknown) {
    return (model as { modelName?: string }).modelName ?? '';
}

function createCourt(
    tenant: string,
    overrides: Partial<StoredCourt> = {},
): StoredCourt {
    return {
        _id: id(),
        tenant,
        name: `Court ${Math.random()}`,
        status: 'available',
        currentChampionshipId: null,
        ...overrides,
    };
}

function createChampionship(
    tenant: string,
    overrides: Partial<StoredChampionship> = {},
): StoredChampionship {
    return {
        _id: id(),
        tenant,
        courts: [],
        ...overrides,
    };
}

function installDatabase(
    courts: StoredCourt[],
    championships: StoredChampionship[],
    matches: StoredMatch[] = [],
    options: DatabaseOptions = {},
) {
    vi.spyOn(DatabaseHelper, 'count').mockImplementation(
        async (model, tenant, query) => {
            expect(modelName(model)).toBe(modelName(Match));
            const statuses = (query.status as { $in: string[] }).$in;
            return matches.filter(
                (match) =>
                    match.tenant === tenant &&
                    sameId(match.championshipId, query.championshipId) &&
                    statuses.includes(match.status),
            ).length;
        },
    );

    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (model, tenant, query) => {
            if (modelName(model) !== modelName(Championship)) return null;
            return championships.find(
                (championship) =>
                    championship.tenant === tenant &&
                    sameId(championship._id, query._id),
            ) as never ?? null;
        },
    );

    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (model, tenant, query, update) => {
            if (modelName(model) !== modelName(Championship)) return null;
            if (options.failChampionshipUpdate === 'throw') {
                throw new Error('simulated championship write failure');
            }
            if (options.failChampionshipUpdate === 'return-null') return null;

            const championship = championships.find(
                (candidate) =>
                    candidate.tenant === tenant &&
                    sameId(candidate._id, query._id),
            );
            if (!championship) return null;

            const add = (update.$addToSet as {
                courts?: { $each?: Types.ObjectId[] };
            } | undefined)?.courts?.$each ?? [];
            add.forEach((courtId) => {
                if (!championship.courts.some((existing) => sameId(existing, courtId))) {
                    championship.courts.push(courtId);
                }
            });

            const remove = (update.$pull as {
                courts?: { $in?: Types.ObjectId[] };
            } | undefined)?.courts?.$in ?? [];
            championship.courts = championship.courts.filter(
                (existing) => !remove.some((courtId) => sameId(existing, courtId)),
            );
            return championship as never;
        },
    );

    vi.spyOn(DatabaseHelper, 'getItemsWithRelations').mockImplementation(
        async (model, tenant, query) => {
            expect(modelName(model)).toBe(modelName(Court));
            const docs = courts.filter((court) => {
                if (court.tenant !== tenant || court.status !== query.status) return false;
                const championshipQuery = query.currentChampionshipId as {
                    $exists?: boolean;
                };
                return championshipQuery?.$exists === false
                    ? court.currentChampionshipId === undefined
                    : true;
            });
            return { docs, totalDocs: docs.length } as never;
        },
    );

    const tenantModel = (tenant: string) => ({
        find: vi.fn(async (query: Record<string, unknown>) => {
            const requested = ((query._id as { $in?: Types.ObjectId[] })?.$in ?? []);
            return courts.filter((court) => {
                if (court.tenant !== tenant) return false;
                if (!requested.some((courtId) => sameId(court._id, courtId))) return false;
                if (
                    query.currentChampionshipId &&
                    !sameId(court.currentChampionshipId, query.currentChampionshipId)
                ) return false;
                return true;
            });
        }),
        updateMany: vi.fn(async (
            query: Record<string, unknown>,
            update: Record<string, unknown>,
        ) => {
            if (options.failCourtUpdate) {
                throw new Error('simulated court write failure');
            }
            const requested = ((query._id as { $in?: Types.ObjectId[] })?.$in ?? []);
            const candidates = courts.filter((court) => {
                if (court.tenant !== tenant) return false;
                if (!requested.some((courtId) => sameId(court._id, courtId))) return false;
                if (query.status && court.status !== query.status) return false;
                if (
                    query.currentChampionshipId &&
                    !sameId(court.currentChampionshipId, query.currentChampionshipId)
                ) return false;
                if (query.$or) {
                    return court.currentChampionshipId === undefined ||
                        court.currentChampionshipId === null;
                }
                return true;
            });
            const selected = options.partialCourtUpdate
                ? candidates.slice(0, 1)
                : candidates;
            selected.forEach((court) => {
                const set = update.$set as Partial<StoredCourt> | undefined;
                if (set?.status) court.status = set.status;
                if (set?.currentChampionshipId) {
                    court.currentChampionshipId = set.currentChampionshipId;
                }
                if (update.$unset) delete court.currentChampionshipId;
            });
            return { modifiedCount: selected.length };
        }),
    });

    vi.spyOn(Court, 'byTenant').mockImplementation(tenantModel as never);
}

function validatorApp(validators: RequestHandler[]) {
    const app = express();
    app.use(express.json());
    app.post(
        '/attach/:championshipId',
        validators,
        (_req: Request, res: Response) => {
            res.status(200).json({ success: true });
        },
    );
    app.patch(
        '/detach/:championshipId',
        validators,
        (_req: Request, res: Response) => {
            res.status(200).json({ success: true });
        },
    );
    return app;
}

describe('P0 - Court assignment to Championship', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('P0.1 attaches one available Court bidirectionally', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship]);

        const result = await new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        );

        expect(court.status).toBe('reserved');
        expect(court.currentChampionshipId?.toString()).toBe(championship._id.toString());
        expect(championship.courts.map(String)).toEqual([court._id.toString()]);
        expect(result.courtsReserved).toBe(1);
    });

    it('P0.2 attaches multiple Courts exactly once', async () => {
        const championship = createChampionship('tenant-a');
        const courts = [createCourt('tenant-a'), createCourt('tenant-a')];
        installDatabase(courts, [championship]);

        await new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: courts.map((court) => court._id.toString()) },
        );

        expect(courts.every((court) => court.status === 'reserved')).toBe(true);
        expect(new Set(championship.courts.map(String)).size).toBe(2);
    });

    it.each([
        ['missing', {}],
        ['empty', { courtIds: [] }],
        ['not-array', { courtIds: 'court' }],
    ])('P0.3 rejects %s courtIds without writes', async (_case, body) => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship]);

        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            body as { courtIds: string[] },
        )).rejects.toThrow('courtIds is required');
        expect(court.status).toBe('available');
        expect(championship.courts).toEqual([]);
    });

    it('P0.4 rejects duplicate IDs and preserves integrity', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship]);

        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString(), court._id.toString()] },
        )).rejects.toThrow('Duplicated');
        expect(championship.courts).toEqual([]);
    });

    it('P0.5 rejects a missing Court without partial association', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship]);

        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString(), id().toString()] },
        )).rejects.toThrow('not found');
        expect(court.status).toBe('available');
        expect(championship.courts).toEqual([]);
    });

    it('P0.6 rejects a missing Championship without changing Court', async () => {
        const court = createCourt('tenant-a');
        installDatabase([court], []);
        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            id().toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow('Championship not found');
        expect(court.status).toBe('available');
    });

    it.each([
        ['Court belongs to tenant B', 'tenant-a', 'tenant-b'],
        ['Championship belongs to tenant A', 'tenant-b', 'tenant-a'],
    ])('P0.7/P0.8 isolates tenant: %s', async (_case, caller, owner) => {
        const championship = createChampionship(owner);
        const court = createCourt(owner);
        installDatabase([court], [championship]);
        await expect(new CourtService().attachCourtsToChampionship(
            caller,
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow();
        expect(court.status).toBe('available');
        expect(championship.courts).toEqual([]);
    });

    it('P0.9 is idempotent when Court already belongs to the same Championship', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championship._id,
        });
        championship.courts = [court._id];
        installDatabase([court], [championship]);

        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).resolves.toMatchObject({ courtsReserved: 0 });
        expect(championship.courts.map(String)).toEqual([court._id.toString()]);
    });

    it('P0.10 rejects a Court assigned to another Championship', async () => {
        const championshipA = createChampionship('tenant-a');
        const championshipB = createChampionship('tenant-a');
        const court = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championshipB._id,
        });
        installDatabase([court], [championshipA, championshipB]);
        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championshipA._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow('not available');
        expect(court.currentChampionshipId).toEqual(championshipB._id);
    });

    it.each(['reserved', 'occupied', 'maintenance'] as const)(
        'P0.11 rejects status %s',
        async (status) => {
            const championship = createChampionship('tenant-a');
            const court = createCourt('tenant-a', { status });
            installDatabase([court], [championship]);
            await expect(new CourtService().attachCourtsToChampionship(
                'tenant-a',
                championship._id.toString(),
                { courtIds: [court._id.toString()] },
            )).rejects.toThrow('not available');
        },
    );

    it('P0.13/P0.14 detaches selected Courts and preserves the others', async () => {
        const championship = createChampionship('tenant-a');
        const selected = [
            createCourt('tenant-a', { status: 'reserved', currentChampionshipId: championship._id }),
            createCourt('tenant-a', { status: 'reserved', currentChampionshipId: championship._id }),
        ];
        const untouched = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championship._id,
        });
        championship.courts = [...selected, untouched].map((court) => court._id);
        installDatabase([...selected, untouched], [championship]);

        const result = await new CourtService().detachCourtsFromChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: selected.map((court) => court._id.toString()) },
        );

        expect(result.courtsReleased).toBe(2);
        expect(selected.every((court) => court.status === 'available')).toBe(true);
        expect(selected.every((court) => court.currentChampionshipId === undefined)).toBe(true);
        expect(championship.courts.map(String)).toEqual([untouched._id.toString()]);
    });

    it('P0.15 rejects detaching a Court from another Championship', async () => {
        const championshipA = createChampionship('tenant-a');
        const championshipB = createChampionship('tenant-a');
        const court = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championshipB._id,
        });
        installDatabase([court], [championshipA, championshipB]);
        await expect(new CourtService().detachCourtsFromChampionship(
            'tenant-a',
            championshipA._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow('not assigned');
        expect(court.currentChampionshipId).toEqual(championshipB._id);
    });

    it('P0.16 isolates detach by tenant', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championship._id,
        });
        championship.courts = [court._id];
        installDatabase([court], [championship]);
        await expect(new CourtService().detachCourtsFromChampionship(
            'tenant-b',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow();
        expect(championship.courts).toHaveLength(1);
    });

    it.each(['scheduled', 'in_progress'] as const)(
        'P0.17 blocks detach when a %s Match exists',
        async (status) => {
            const championship = createChampionship('tenant-a');
            const court = createCourt('tenant-a', {
                status: 'reserved',
                currentChampionshipId: championship._id,
            });
            championship.courts = [court._id];
            installDatabase([court], [championship], [{
                tenant: 'tenant-a',
                championshipId: championship._id,
                status,
            }]);
            await expect(new CourtService().detachCourtsFromChampionship(
                'tenant-a',
                championship._id.toString(),
                { courtIds: [court._id.toString()] },
            )).rejects.toThrow('matches created');
        },
    );

    it.each(['finished', 'walkover'] as const)(
        'P0.17 blocks detach when historical %s Match exists',
        async (status) => {
            const championship = createChampionship('tenant-a');
            const court = createCourt('tenant-a', {
                status: 'reserved',
                currentChampionshipId: championship._id,
            });
            championship.courts = [court._id];
            installDatabase([court], [championship], [{
                tenant: 'tenant-a',
                championshipId: championship._id,
                status,
            }]);
            await expect(new CourtService().detachCourtsFromChampionship(
                'tenant-a',
                championship._id.toString(),
                { courtIds: [court._id.toString()] },
            )).rejects.toThrow('matches created');
        },
    );

    it('P0.18 rolls Championship back if releasing Courts fails', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a', {
            status: 'reserved',
            currentChampionshipId: championship._id,
        });
        championship.courts = [court._id];
        installDatabase([court], [championship], [], { failCourtUpdate: true });
        await expect(new CourtService().detachCourtsFromChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow('simulated');
        expect(championship.courts.map(String)).toEqual([court._id.toString()]);
        expect(court.status).toBe('reserved');
    });

    it('P0.19 returns available Courts with null assignment and only current tenant', async () => {
        const included = createCourt('tenant-a', {
            status: 'available',
            currentChampionshipId: null,
        });
        const excluded = [
            createCourt('tenant-a', { status: 'reserved' }),
            createCourt('tenant-a', { status: 'occupied' }),
            createCourt('tenant-b', { status: 'available', currentChampionshipId: null }),
        ];
        installDatabase([included, ...excluded], []);
        const result = await new CourtService().getAvailableCourts('tenant-a');
        expect((result as { docs: StoredCourt[] }).docs.map((court) => court._id))
            .toContainEqual(included._id);
    });

    it('P0.20/P0.21 detach returns Court to available; attach removes it', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a', { currentChampionshipId: undefined });
        installDatabase([court], [championship]);
        const service = new CourtService();
        expect((await service.getAvailableCourts('tenant-a') as { docs: StoredCourt[] }).docs)
            .toHaveLength(1);
        await service.attachCourtsToChampionship('tenant-a', championship._id.toString(), {
            courtIds: [court._id.toString()],
        });
        expect((await service.getAvailableCourts('tenant-a') as { docs: StoredCourt[] }).docs)
            .toHaveLength(0);
        await service.detachCourtsFromChampionship('tenant-a', championship._id.toString(), {
            courtIds: [court._id.toString()],
        });
        expect((await service.getAvailableCourts('tenant-a') as { docs: StoredCourt[] }).docs)
            .toHaveLength(1);
    });

    it('P0.23 rolls Courts back when Championship attach returns null', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship], [], {
            failChampionshipUpdate: 'return-null',
        });
        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow();
        expect(court.status).toBe('available');
        expect(court.currentChampionshipId).toBeUndefined();
    });

    it('P0.23 rolls Courts back when Championship attach throws', async () => {
        const championship = createChampionship('tenant-a');
        const court = createCourt('tenant-a');
        installDatabase([court], [championship], [], {
            failChampionshipUpdate: 'throw',
        });
        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: [court._id.toString()] },
        )).rejects.toThrow('simulated');
        expect(court.status).toBe('available');
        expect(court.currentChampionshipId).toBeUndefined();
    });

    it('P0.23 rolls back a partial Court reservation', async () => {
        const championship = createChampionship('tenant-a');
        const courts = [createCourt('tenant-a'), createCourt('tenant-a')];
        installDatabase(courts, [championship], [], { partialCourtUpdate: true });
        await expect(new CourtService().attachCourtsToChampionship(
            'tenant-a',
            championship._id.toString(),
            { courtIds: courts.map((court) => court._id.toString()) },
        )).rejects.toThrow('could not be reserved');
        expect(courts.every((court) => court.status === 'available')).toBe(true);
    });

    it('P0.24 lets only one Championship reserve a Court concurrently', async () => {
        const championships = [
            createChampionship('tenant-a'),
            createChampionship('tenant-a'),
        ];
        const court = createCourt('tenant-a');
        installDatabase([court], championships);
        const service = new CourtService();
        const results = await Promise.allSettled(championships.map((championship) =>
            service.attachCourtsToChampionship(
                'tenant-a',
                championship._id.toString(),
                { courtIds: [court._id.toString()] },
            ),
        ));
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(championships.filter((item) => item.courts.length === 1)).toHaveLength(1);
    });
});

describe('P0 - Court assignment HTTP validation', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        ['missing', {}],
        ['empty', { courtIds: [] }],
        ['not-array', { courtIds: 'court' }],
    ])('rejects attach body: %s', async (_case, body) => {
        const app = validatorApp(validateCourt.attachCourtsToChampionship as RequestHandler[]);
        const response = await request(app)
            .post(`/attach/${id().toString()}`)
            .send(body);
        expect(response.status).toBe(422);
    });

    it('accepts the real detach payload { courtIds: string[] }', async () => {
        const app = validatorApp(validateCourt.detachCourtsFromChampionship as RequestHandler[]);
        const response = await request(app)
            .patch(`/detach/${id().toString()}`)
            .send({ courtIds: [id().toString()] });
        expect(response.status).toBe(200);
    });
});
