import { Types } from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const nanoidMock = vi.hoisted(() => vi.fn());

vi.mock('nanoid', () => ({
    nanoid: nanoidMock,
}));

vi.mock('../../../src/api/config/env.config', () => ({
    env: {
        FRONTEND_URL: 'https://frontend.example',
        FRONTEND_URL_DEV: 'http://localhost:3000',
        FRONTEND_URL_TENANT: 'http://__TENANT__.localhost:3000',
        API_PREFIX: '/api/v1',
    },
}));

vi.mock('../../../src/api/config', () => ({
    Logger: class {
        debug() { }
        error() { }
        info() { }
        warn() { }
    },
}));

import { InvitationLinkController } from '../../../src/api/controllers/championship/invitationLink.controller';
import type { IUserCustomRequest } from '../../../src/api/interfaces';
import Championship from '../../../src/api/models/mongoose/championship/championship';
import ChampionshipConfiguration from '../../../src/api/models/mongoose/championship/configuration';
import InvitationLink from '../../../src/api/models/mongoose/championship/invitationLink';
import { InvitationLinkService } from '../../../src/api/services/championship/invitationLink.service';
import { DatabaseHelper } from '../../../src/api/utils/database.helper';

type ChampionshipStatus =
    | 'draft'
    | 'registration'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

interface GenerationState {
    storedTenant: string;
    requestedTenant: string;
    championshipId: Types.ObjectId;
    championship: {
        _id: Types.ObjectId;
        status: ChampionshipStatus;
        startDate: Date;
    };
    configuration: {
        _id: Types.ObjectId;
        championshipId: Types.ObjectId;
        maxTeams: number;
        registrationDeadline: Date;
        matchRules: { volleyballType: 'beach' | 'indoor' };
        competitionRules: Record<string, any>;
    };
    existingLink: Record<string, any> | null;
    createdLinks: Array<Record<string, any>>;
    existingCodes: Set<string>;
}

const FIXED_NOW = new Date('2026-07-29T12:00:00.000Z');
const DEADLINE = new Date('2026-08-01T12:00:00.000Z');
const VALID_EXPIRATION = new Date('2026-07-31T12:00:00.000Z');

function createState(
    overrides: {
        storedTenant?: string;
        requestedTenant?: string;
        status?: ChampionshipStatus;
        maxTeams?: number;
        existingLink?: Record<string, any> | null;
        existingCodes?: string[];
    } = {},
): GenerationState {
    const championshipId = new Types.ObjectId();

    return {
        storedTenant: overrides.storedTenant ?? 'tenant-a',
        requestedTenant: overrides.requestedTenant ?? 'tenant-a',
        championshipId,
        championship: {
            _id: championshipId,
            status: overrides.status ?? 'registration',
            startDate: new Date('2026-08-10T12:00:00.000Z'),
        },
        configuration: {
            _id: new Types.ObjectId(),
            championshipId,
            maxTeams: overrides.maxTeams ?? 8,
            registrationDeadline: DEADLINE,
            matchRules: { volleyballType: 'beach' },
            competitionRules: {
                genderMode: 'open',
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: { enabled: false, list: [] },
            },
        },
        existingLink: overrides.existingLink ?? null,
        createdLinks: [],
        existingCodes: new Set(overrides.existingCodes ?? []),
    };
}

function modelName(model: unknown): string {
    return (model as { modelName?: string }).modelName ?? '';
}

function installDatabase(state: GenerationState) {
    const tenantCanRead = (tenant: string) => tenant === state.storedTenant;

    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (model: any, tenant: string, query: Record<string, any>) => {
            if (!tenantCanRead(tenant)) return null;

            switch (modelName(model)) {
                case modelName(Championship):
                    return query._id?.toString() ===
                        state.championshipId.toString()
                        ? ({ ...state.championship } as any)
                        : null;
                case modelName(ChampionshipConfiguration):
                    return query.championshipId?.toString() ===
                        state.championshipId.toString()
                        ? ({ ...state.configuration } as any)
                        : null;
                case modelName(InvitationLink):
                    if (query.code) {
                        return state.existingCodes.has(query.code)
                            ? ({ code: query.code } as any)
                            : null;
                    }
                    return state.existingLink as any;
                default:
                    return null;
            }
        },
    );

    vi.spyOn(DatabaseHelper, 'findOneWithRelations').mockImplementation(
        async (model: any, tenant: string, query: Record<string, any>) => {
            if (
                !tenantCanRead(tenant) ||
                modelName(model) !== modelName(ChampionshipConfiguration) ||
                query.championshipId?.toString() !==
                state.championshipId.toString()
            ) {
                return null;
            }

            return {
                ...state.configuration,
                championshipId: { ...state.championship },
            } as any;
        },
    );

    vi.spyOn(DatabaseHelper, 'create').mockImplementation(
        async (
            model: any,
            tenant: string,
            data: Record<string, any>,
        ) => {
            if (modelName(model) !== modelName(InvitationLink)) {
                throw new Error('Unexpected model');
            }

            if (state.existingCodes.has(data.code)) {
                const duplicateError = new Error('duplicate key code');
                Object.assign(duplicateError, { code: 11000 });
                throw duplicateError;
            }

            const document = {
                ...data,
                _id: new Types.ObjectId(),
                tenant,
            };
            state.createdLinks.push(document);
            state.existingCodes.add(data.code);
            return document as any;
        },
    );
}

async function generate(
    state: GenerationState,
    maxUses = 5,
    expiresAt = VALID_EXPIRATION,
) {
    const service = new InvitationLinkService();
    return service.generateLink(
        state.requestedTenant,
        state.championshipId,
        maxUses,
        expiresAt,
    );
}

describe('P0 - InvitationLink generation contract', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
        nanoidMock.mockReset();
        nanoidMock.mockReturnValue('generated-code');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('P0.1 creates a valid active link with zero confirmed uses', async () => {
        const state = createState();
        installDatabase(state);

        const result = await generate(state);

        expect(state.createdLinks).toHaveLength(1);
        expect(state.createdLinks[0]).toMatchObject({
            championshipId: state.championshipId,
            code: 'generated-code',
            maxUses: 5,
            expiresAt: VALID_EXPIRATION,
            isActive: true,
            usedCount: 0,
        });
        expect(result).toMatchObject({
            code: 'generated-code',
            expiresAt: VALID_EXPIRATION,
            maxUses: 5,
            registrationRules: {
                volleyballType: 'beach',
                allowedPositions: ['BLOCKER', 'DEFENDER'],
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                gender: { mode: 'open' },
                categories: [],
            },
        });
        expect(state.createdLinks[0]).not.toHaveProperty('registrationRules');
        expect(result.invitationLink).toBeTruthy();
    });

    it('exposes the generation endpoint contract as HTTP 201', async () => {
        const controller = new InvitationLinkController();
        const generateLink = vi.fn().mockResolvedValue({
            invitationLink:
                'https://tenant-a.example/register/generated-code',
            code: 'generated-code',
            expiresAt: VALID_EXPIRATION,
        });
        Object.assign(controller as object, {
            invitationLinkService: { generateLink },
        });

        const status = vi.fn().mockReturnThis();
        const json = vi.fn();
        const request = {
            clientAccount: 'tenant-a',
            params: { championshipId: new Types.ObjectId().toString() },
            body: {
                maxUses: 5,
                expiresAt: VALID_EXPIRATION.toISOString(),
            },
        } as unknown as IUserCustomRequest;

        await controller.generateLink(
            request,
            { status, json } as never,
        );

        expect(generateLink).toHaveBeenCalledWith(
            'tenant-a',
            request.params.championshipId,
            5,
            VALID_EXPIRATION,
        );
        expect(status).toHaveBeenCalledWith(201);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                code: 'generated-code',
                expiresAt: VALID_EXPIRATION,
            }),
        );
    });

    describe('P0.2 maxUses', () => {
        it('accepts maxUses = 1', async () => {
            const state = createState();
            installDatabase(state);

            await expect(generate(state, 1)).resolves.toBeDefined();
        });

        it.each([
            ['zero', 0],
            ['negative', -1],
            ['decimal', 1.5],
            ['greater than maxTeams', 9],
        ])('rejects %s maxUses (%s)', async (_label, maxUses) => {
            const state = createState({ maxTeams: 8 });
            installDatabase(state);

            await expect(generate(state, maxUses)).rejects.toThrow();
            expect(state.createdLinks).toHaveLength(0);
        });
    });

    describe('P0.3 expiresAt', () => {
        it.each([
            ['past', new Date('2026-07-29T11:59:59.999Z')],
            ['equal to now', FIXED_NOW],
            [
                'after registrationDeadline',
                new Date('2026-08-01T12:00:00.001Z'),
            ],
        ])('rejects an expiration %s', async (_label, expiresAt) => {
            const state = createState();
            installDatabase(state);

            await expect(generate(state, 5, expiresAt)).rejects.toThrow();
            expect(state.createdLinks).toHaveLength(0);
        });

        it.each([
            ['before registrationDeadline', VALID_EXPIRATION],
            ['equal to registrationDeadline', DEADLINE],
        ])('accepts an expiration %s', async (_label, expiresAt) => {
            const state = createState();
            installDatabase(state);

            await expect(
                generate(state, 5, expiresAt),
            ).resolves.toBeDefined();
        });
    });

    describe('P0.4 Championship status', () => {
        it('accepts registration', async () => {
            const state = createState({ status: 'registration' });
            installDatabase(state);

            await expect(generate(state)).resolves.toBeDefined();
        });

        it.each([
            'draft',
            'in_progress',
            'completed',
            'cancelled',
        ] as ChampionshipStatus[])('rejects %s', async (status) => {
            const state = createState({ status });
            installDatabase(state);

            await expect(generate(state)).rejects.toThrow();
            expect(state.createdLinks).toHaveLength(0);
        });
    });

    it('P0.5 rejects a Championship owned by another tenant', async () => {
        const state = createState({
            storedTenant: 'tenant-a',
            requestedTenant: 'tenant-b',
        });
        installDatabase(state);

        await expect(generate(state)).rejects.toThrow();
        expect(state.createdLinks).toHaveLength(0);
    });

    it('P0.6 rejects generation while another usable link is active', async () => {
        const state = createState({
            existingLink: {
                isActive: true,
                expiresAt: VALID_EXPIRATION,
                maxUses: 5,
                usedCount: 1,
            },
        });
        installDatabase(state);

        await expect(generate(state)).rejects.toThrow();
        expect(state.createdLinks).toHaveLength(0);
    });

    it('P0.7 allows replacement of an expired active link', async () => {
        const state = createState({
            existingLink: {
                isActive: true,
                expiresAt: new Date('2026-07-29T11:59:59.999Z'),
                maxUses: 5,
                usedCount: 1,
            },
        });
        installDatabase(state);

        await expect(generate(state)).resolves.toBeDefined();
        expect(state.createdLinks).toHaveLength(1);
    });

    it('P0.8 allows replacement of an exhausted active link', async () => {
        const state = createState({
            existingLink: {
                isActive: true,
                expiresAt: VALID_EXPIRATION,
                maxUses: 5,
                usedCount: 5,
            },
        });
        installDatabase(state);

        await expect(generate(state)).resolves.toBeDefined();
        expect(state.createdLinks).toHaveLength(1);
    });

    it('P0.9 returns the real frontend route /register/:code', async () => {
        const state = createState();
        installDatabase(state);

        const result = await generate(state);

        expect(new URL(result.invitationLink).pathname).toBe(
            '/register/generated-code',
        );
        expect(result.invitationLink).not.toContain('/api/v1');
        expect(result.invitationLink).not.toContain('?code=');
    });

    it('P0.10 builds a tenant-aware public frontend URL', async () => {
        const state = createState();
        installDatabase(state);

        const result = await generate(state);

        expect(result.invitationLink).toBe(
            'http://tenant-a.localhost:3000/register/generated-code',
        );
    });

    it('P0.11 retries once when nanoid collides with an existing code', async () => {
        const state = createState({
            existingCodes: ['duplicate-code'],
        });
        installDatabase(state);
        nanoidMock
            .mockReturnValueOnce('duplicate-code')
            .mockReturnValueOnce('retry-code');

        const result = await generate(state);

        expect(nanoidMock).toHaveBeenCalledTimes(2);
        expect(result.code).toBe('retry-code');
        expect(state.createdLinks).toHaveLength(1);
    });

    it('P0.11 stops after three invitation code collisions', async () => {
        const state = createState({
            existingCodes: ['duplicate-code'],
        });
        installDatabase(state);
        nanoidMock.mockReturnValue('duplicate-code');

        await expect(generate(state)).rejects.toThrow('duplicate key code');

        expect(nanoidMock).toHaveBeenCalledTimes(3);
        expect(state.createdLinks).toHaveLength(0);
    });
});
