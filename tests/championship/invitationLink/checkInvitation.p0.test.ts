import { Types } from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('../../../src/api/config/env.config', () => ({
    env: {
        FRONTEND_URL_TENANT: 'http://__TENANT__.localhost:3000',
    },
}));

vi.mock('../../../src/api/config', () => ({
    Logger: class {
        debug() {}
        error() {}
        info() {}
        warn() {}
    },
}));

vi.mock('../../../src/api/config/logger/WinstonLogger', () => ({
    Logger: class {
        debug() {}
        error() {}
        info() {}
        warn() {}
    },
}));

import { InvitationLinkController } from '../../../src/api/controllers/championship/invitationLink.controller';
import { InvitationLinkRoutes } from '../../../src/api/constants/apiRoutes/invitationlinkroutes.ts/invitationlinkRoutes';
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

interface CheckState {
    tenant: string;
    championshipId: Types.ObjectId;
    code: string;
    invitationLink: {
        _id: Types.ObjectId;
        championshipId: Types.ObjectId;
        code: string;
        isActive: boolean;
        expiresAt: Date;
        maxUses: number;
        usedCount: number;
    };
    championship: {
        _id: Types.ObjectId;
        name: string;
        status: ChampionshipStatus;
    };
    configuration: {
        _id: Types.ObjectId;
        championshipId: Types.ObjectId;
        registrationDeadline: Date;
        matchRules: { volleyballType: 'beach' | 'indoor' };
        competitionRules: Record<string, any>;
    };
    registrations: unknown[];
    teams: unknown[];
    users: unknown[];
    players: unknown[];
}

interface CheckInvitationOperation {
    checkInvitation(tenant: string, code: string): Promise<{
        championshipId: Types.ObjectId;
        expiresAt: Date;
        maxUses: number;
        usedCount: number;
        remainingUses: number;
        registrationRules: Record<string, unknown>;
    }>;
}

const FIXED_NOW = new Date('2026-07-29T12:00:00.000Z');
const FUTURE = new Date('2026-08-01T12:00:00.000Z');
const PAST = new Date('2026-07-29T11:59:59.999Z');

function createState(
    overrides: {
        isActive?: boolean;
        expiresAt?: Date;
        maxUses?: number;
        usedCount?: number;
        status?: ChampionshipStatus;
        registrationDeadline?: Date;
    } = {},
): CheckState {
    const championshipId = new Types.ObjectId();

    return {
        tenant: 'tenant-a',
        championshipId,
        code: 'read-only-code',
        invitationLink: {
            _id: new Types.ObjectId(),
            championshipId,
            code: 'read-only-code',
            isActive: overrides.isActive ?? true,
            expiresAt: overrides.expiresAt ?? FUTURE,
            maxUses: overrides.maxUses ?? 10,
            usedCount: overrides.usedCount ?? 3,
        },
        championship: {
            _id: championshipId,
            name: 'Public Championship',
            status: overrides.status ?? 'registration',
        },
        configuration: {
            _id: new Types.ObjectId(),
            championshipId,
            registrationDeadline:
                overrides.registrationDeadline ??
                new Date('2026-07-31T23:59:00.000Z'),
            matchRules: { volleyballType: 'beach' },
            competitionRules: {
                genderMode: 'open',
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: { enabled: false, list: [] },
            },
        },
        registrations: [],
        teams: [],
        users: [],
        players: [],
    };
}

function modelName(model: unknown): string {
    return (model as { modelName?: string }).modelName ?? '';
}

function installDatabase(state: CheckState) {
    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (
            model: any,
            tenant: string,
            query: Record<string, any>,
        ) => {
            if (tenant !== state.tenant) return null;

            switch (modelName(model)) {
                case modelName(InvitationLink):
                    return query.code === state.code
                        ? ({ ...state.invitationLink } as any)
                        : null;
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
                default:
                    return null;
            }
        },
    );

    vi.spyOn(DatabaseHelper, 'create').mockRejectedValue(
        new Error('checkInvitation must not create data'),
    );
    vi.spyOn(DatabaseHelper, 'update').mockRejectedValue(
        new Error('checkInvitation must not update data'),
    );
    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockRejectedValue(
        new Error('checkInvitation must not update InvitationLink'),
    );
    vi.spyOn(DatabaseHelper, 'delete').mockRejectedValue(
        new Error('checkInvitation must not delete data'),
    );
}

function check(service: InvitationLinkService, tenant: string, code: string) {
    return (service as unknown as CheckInvitationOperation).checkInvitation(
        tenant,
        code,
    );
}

function expectNoWrites(state: CheckState, usedCount: number) {
    expect(state.invitationLink.usedCount).toBe(usedCount);
    expect(state.registrations).toHaveLength(0);
    expect(state.teams).toHaveLength(0);
    expect(state.users).toHaveLength(0);
    expect(state.players).toHaveLength(0);
    expect(DatabaseHelper.create).not.toHaveBeenCalled();
    expect(DatabaseHelper.update).not.toHaveBeenCalled();
    expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
    expect(DatabaseHelper.delete).not.toHaveBeenCalled();
}

describe('P0 - read-only InvitationLink check', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('returns the minimal public DTO without consuming a valid invitation', async () => {
        const state = createState();
        installDatabase(state);

        const result = await check(
            new InvitationLinkService(),
            state.tenant,
            state.code,
        );

        expect(result).toEqual({
            championshipId: state.championshipId,
            expiresAt: FUTURE,
            maxUses: 10,
            usedCount: 3,
            remainingUses: 7,
            registrationRules: {
                volleyballType: 'beach',
                allowedPositions: ['BLOCKER', 'DEFENDER'],
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                gender: { mode: 'open' },
                categories: [],
            },
        });
        expect(Object.keys(result).sort()).toEqual(
            [
                'championshipId',
                'expiresAt',
                'maxUses',
                'usedCount',
                'remainingUses',
                'registrationRules',
            ].sort(),
        );
        expectNoWrites(state, 3);
    });

    it('can be called ten times without changing persisted state', async () => {
        const state = createState();
        installDatabase(state);
        const service = new InvitationLinkService();

        const results = await Promise.all(
            Array.from({ length: 10 }, () =>
                check(service, state.tenant, state.code),
            ),
        );

        expect(results).toHaveLength(10);
        expect(results.every((result) => result.usedCount === 3)).toBe(true);
        expectNoWrites(state, 3);
    });

    it('reflects the current configuration when the same link is checked again', async () => {
        const state = createState();
        installDatabase(state);
        const service = new InvitationLinkService();

        const first = await check(service, state.tenant, state.code);

        state.configuration.matchRules = { volleyballType: 'indoor' };
        state.configuration.competitionRules = {
            genderMode: 'female',
            teamSize: { minPlayers: 6, maxPlayers: 12, starters: 6 },
            categories: { enabled: false, list: [] },
        };

        const second = await check(service, state.tenant, state.code);

        expect(first.registrationRules).toMatchObject({
            volleyballType: 'beach',
            gender: { mode: 'open' },
        });
        expect(second.registrationRules).toEqual({
            volleyballType: 'indoor',
            allowedPositions: ['SETTER', 'OUTSIDE', 'MIDDLE', 'OPPOSITE', 'LIBERO'],
            teamSize: { minPlayers: 6, maxPlayers: 12, starters: 6 },
            gender: { mode: 'female' },
            categories: [],
        });
        expectNoWrites(state, 3);
    });

    it('rejects an expired invitation without writes', async () => {
        const state = createState({ expiresAt: PAST });
        installDatabase(state);

        await expect(
            check(new InvitationLinkService(), state.tenant, state.code),
        ).rejects.toThrow(/expired/i);
        expectNoWrites(state, 3);
    });

    it('rejects an inactive invitation without writes', async () => {
        const state = createState({ isActive: false });
        installDatabase(state);

        await expect(
            check(new InvitationLinkService(), state.tenant, state.code),
        ).rejects.toThrow(/active/i);
        expectNoWrites(state, 3);
    });

    it('rejects an exhausted invitation without writes', async () => {
        const state = createState({ maxUses: 5, usedCount: 5 });
        installDatabase(state);

        await expect(
            check(new InvitationLinkService(), state.tenant, state.code),
        ).rejects.toThrow(/maximum|exhausted/i);
        expectNoWrites(state, 5);
    });

    describe('Championship status', () => {
        it('accepts registration', async () => {
            const state = createState({ status: 'registration' });
            installDatabase(state);

            await expect(
                check(new InvitationLinkService(), state.tenant, state.code),
            ).resolves.toMatchObject({
                championshipId: state.championshipId,
            });
            expectNoWrites(state, 3);
        });

        it.each([
            'draft',
            'in_progress',
            'completed',
            'cancelled',
        ] as ChampionshipStatus[])('rejects %s without writes', async (status) => {
            const state = createState({ status });
            installDatabase(state);

            await expect(
                check(new InvitationLinkService(), state.tenant, state.code),
            ).rejects.toThrow(/registration|accepting/i);
            expectNoWrites(state, 3);
        });
    });

    it('rejects a closed registrationDeadline without writes', async () => {
        const state = createState({ registrationDeadline: PAST });
        installDatabase(state);

        await expect(
            check(new InvitationLinkService(), state.tenant, state.code),
        ).rejects.toThrow(/deadline|closed/i);
        expectNoWrites(state, 3);
    });

    it('does not expose or modify tenant A invitation from tenant B', async () => {
        const state = createState();
        installDatabase(state);

        await expect(
            check(new InvitationLinkService(), 'tenant-b', state.code),
        ).rejects.toThrow(/not found|invalid/i);
        expectNoWrites(state, 3);
    });

    it('defines a public GET route with the code as a path parameter', () => {
        expect(
            (
                InvitationLinkRoutes as unknown as {
                    CHECK_INVITATION: string;
                }
            ).CHECK_INVITATION,
        ).toBe('/championships/invitation/:code');
    });

    it('controller returns the public DTO as a successful response', async () => {
        const controller = new InvitationLinkController();
        const dto = {
            championshipId: new Types.ObjectId(),
            expiresAt: FUTURE,
            maxUses: 10,
            usedCount: 3,
            remainingUses: 7,
        };
        const checkInvitation = vi.fn().mockResolvedValue(dto);
        Object.assign(controller as object, {
            invitationLinkService: { checkInvitation },
        });
        const status = vi.fn().mockReturnThis();
        const json = vi.fn();

        await (
            controller as unknown as {
                checkInvitation(
                    req: IUserCustomRequest,
                    res: unknown,
                ): Promise<void>;
            }
        ).checkInvitation(
            {
                clientAccount: 'tenant-a',
                params: { code: 'read-only-code' },
            } as unknown as IUserCustomRequest,
            { status, json },
        );

        expect(checkInvitation).toHaveBeenCalledWith(
            'tenant-a',
            'read-only-code',
        );
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            success: true,
            data: dto,
            message: 'Invitation checked successfully',
        });
    });
});
