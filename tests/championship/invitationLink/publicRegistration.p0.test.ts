import { Types } from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('../../../src/api/config', () => ({
    env: {
        IMAGE_NO_FOUND: null,
        NODE_ENV: 'test',
    },
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

vi.mock('../../../src/api/plugin/mercadopago', () => ({
    generate_link: vi.fn().mockResolvedValue('https://payments.test/checkout'),
    getPaymentDetails: vi.fn(),
}));

vi.mock('../../../src/api/services/email/email.service', () => ({
    EmailService: class {
        sendTemporaryPasswordEmail = vi.fn().mockResolvedValue(undefined);
    },
}));

vi.mock(
    '../../../src/api/domain/championship/rules/championshipCapacity.validator',
    () => ({
        validateChampionshipTeamCapacity: vi.fn().mockResolvedValue(undefined),
    }),
);

vi.mock(
    '../../../src/api/domain/championship/rules/competitionRules.validator',
    () => ({
        validateCompetitionRulesForTeam: vi.fn(),
    }),
);

import { RegistrationService } from '../../../src/api/services/championship/register.service';
import { DatabaseHelper } from '../../../src/api/utils/database.helper';
import { PasswordUtil } from '../../../src/api/utils';
import {
    BeachVolleyballPosition,
    EPSProvider,
} from '../../../src/api/models/mongoose/championship/player';

type ChampionshipStatus =
    | 'draft'
    | 'registration'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

interface TestState {
    tenant: string;
    code: string;
    championshipId: Types.ObjectId;
    championshipStatus: ChampionshipStatus;
    invitationLink: {
        _id: Types.ObjectId;
        championshipId: Types.ObjectId;
        code: string;
        isActive: boolean;
        expiresAt: Date;
        maxUses: number;
        usedCount: number;
    };
    configuration: {
        _id: Types.ObjectId;
        championshipId: Types.ObjectId;
        maxTeams: number;
        registrationDeadline: Date;
        registrationFee: number;
        currency: string;
        competitionRules?: undefined;
    };
    users: Array<Record<string, any>>;
    players: Array<Record<string, any>>;
    teams: Array<Record<string, any>>;
    registrations: Array<Record<string, any>>;
    failRegistrationCreation: boolean;
}

const FIXED_NOW = new Date('2026-07-29T12:00:00.000Z');

function createState(
    overrides: {
        championshipStatus?: ChampionshipStatus;
        isActive?: boolean;
        expiresAt?: Date;
        maxUses?: number;
        usedCount?: number;
        failRegistrationCreation?: boolean;
    } = {},
): TestState {
    const championshipId = new Types.ObjectId();

    return {
        tenant: 'tenant-p0',
        code: 'public-registration-code',
        championshipId,
        championshipStatus: overrides.championshipStatus ?? 'registration',
        invitationLink: {
            _id: new Types.ObjectId(),
            championshipId,
            code: 'public-registration-code',
            isActive: overrides.isActive ?? true,
            expiresAt:
                overrides.expiresAt ??
                new Date('2026-08-01T12:00:00.000Z'),
            maxUses: overrides.maxUses ?? 5,
            usedCount: overrides.usedCount ?? 0,
        },
        configuration: {
            _id: new Types.ObjectId(),
            championshipId,
            maxTeams: 16,
            registrationDeadline: new Date('2026-07-31T23:59:00.000Z'),
            registrationFee: 50_000,
            currency: 'COP',
            competitionRules: undefined,
        },
        users: [],
        players: [],
        teams: [],
        registrations: [],
        failRegistrationCreation:
            overrides.failRegistrationCreation ?? false,
    };
}

function publicRegistrationData(suffix = 'one') {
    return {
        team: {
            name: `Team ${suffix}`,
        },
        players: [
            {
                nie: `NIE-${suffix}`,
                name: `Player ${suffix}`,
                lastName: 'P0',
                email: `${suffix}@example.test`,
                gender: 'female' as const,
                position: BeachVolleyballPosition.DEFENDER,
                eps: EPSProvider.SURA,
            },
        ],
        payerData: {
            name: `Payer ${suffix}`,
            email: `payer-${suffix}@example.test`,
        },
    };
}

function modelName(model: unknown): string {
    return (model as { modelName?: string }).modelName ?? '';
}

function installInMemoryDatabase(
    state: TestState,
    options: { synchronizeInvitationReads?: number } = {},
) {
    let invitationReads = 0;
    let releaseInvitationReads: (() => void) | undefined;
    const invitationReadBarrier =
        options.synchronizeInvitationReads &&
        new Promise<void>((resolve) => {
            releaseInvitationReads = resolve;
        });

    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (model: any, tenant: string, query: Record<string, any>) => {
            expect(tenant).toBe(state.tenant);

            switch (modelName(model)) {
                case 'InvitationLink': {
                    if (query.code !== state.code) return null;

                    if (invitationReadBarrier) {
                        invitationReads += 1;
                        if (
                            invitationReads ===
                            options.synchronizeInvitationReads
                        ) {
                            releaseInvitationReads?.();
                        }
                        await invitationReadBarrier;
                    }

                    // Return a snapshot, as two real Mongo reads may observe the
                    // same value before either registration consumes the link.
                    return { ...state.invitationLink } as any;
                }
                case 'ChampionshipConfiguration':
                    return query.championshipId?.toString() ===
                        state.championshipId.toString()
                        ? ({ ...state.configuration } as any)
                        : null;
                case 'Championship':
                    return query._id?.toString() ===
                        state.championshipId.toString()
                        ? ({
                            _id: state.championshipId,
                            status: state.championshipStatus,
                        } as any)
                        : null;
                case 'Team':
                    return (
                        state.teams.find(
                            (team) =>
                                team.championshipId?.toString() ===
                                    query.championshipId?.toString() &&
                                team.name === query.name,
                        ) ?? null
                    ) as any;
                case 'User':
                    return (
                        state.users.find(
                            (user) =>
                                (query.email && user.email === query.email) ||
                                (query.nie && user.nie === query.nie),
                        ) ?? null
                    ) as any;
                case 'Registration':
                    return (
                        state.registrations.find(
                            (registration) =>
                                registration.teamId?.toString() ===
                                query.teamId?.toString(),
                        ) ?? null
                    ) as any;
                default:
                    return null;
            }
        },
    );

    vi.spyOn(DatabaseHelper, 'create').mockImplementation(
        async (model: any, tenant: string, data: Record<string, any>) => {
            expect(tenant).toBe(state.tenant);
            const document = {
                ...data,
                _id: new Types.ObjectId(),
            };

            switch (modelName(model)) {
                case 'User':
                    state.users.push(document);
                    break;
                case 'Player':
                    state.players.push(document);
                    break;
                case 'Team':
                    state.teams.push(document);
                    break;
                case 'Registration':
                    if (state.failRegistrationCreation) {
                        throw new Error('P0 forced registration failure');
                    }
                    state.registrations.push(document);
                    break;
            }

            return document as any;
        },
    );

    vi.spyOn(DatabaseHelper, 'update').mockResolvedValue({} as any);

    vi.spyOn(DatabaseHelper, 'delete').mockImplementation(
        async (model: any, id: string) => {
            const collections: Record<string, Array<Record<string, any>>> = {
                User: state.users,
                Player: state.players,
                Team: state.teams,
                Registration: state.registrations,
            };
            const collection = collections[modelName(model)];
            if (!collection) return null;

            const index = collection.findIndex(
                (document) => document._id.toString() === id,
            );
            if (index < 0) return null;
            return collection.splice(index, 1)[0] as any;
        },
    );

    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (
            model: any,
            tenant: string,
            query: Record<string, any>,
            update: Record<string, any>,
        ) => {
            expect(tenant).toBe(state.tenant);

            if (modelName(model) === 'Championship') {
                return {
                    _id: state.championshipId,
                    status: state.championshipStatus,
                } as any;
            }

            if (modelName(model) !== 'InvitationLink' || query.code !== state.code) {
                return null;
            }

            const increment = update.$inc?.usedCount ?? 0;
            if (
                increment > 0 &&
                state.invitationLink.usedCount >=
                    state.invitationLink.maxUses
            ) {
                return null;
            }

            state.invitationLink.usedCount = Math.max(
                0,
                state.invitationLink.usedCount + increment,
            );
            return { ...state.invitationLink } as any;
        },
    );
}

async function register(state: TestState, suffix = 'one') {
    const service = new RegistrationService();
    return service.registerTeamUsersAndPlayersWithInvitation(
        state.tenant,
        state.code,
        publicRegistrationData(suffix),
    );
}

describe('P0 - public registration consumes one InvitationLink use', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
        vi.spyOn(PasswordUtil, 'hashPassword').mockResolvedValue(
            'hashed-password',
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('P0.1 consumes exactly one use after a successful registration', async () => {
        const state = createState();
        installInMemoryDatabase(state);

        await register(state);

        expect(state.registrations).toHaveLength(1);
        expect(state.invitationLink.usedCount).toBe(1);
    });

    it('P0.2 does not consume a use when Registration creation fails', async () => {
        const state = createState({ failRegistrationCreation: true });
        installInMemoryDatabase(state);

        await expect(register(state)).rejects.toThrow(
            'P0 forced registration failure',
        );

        expect(state.invitationLink.usedCount).toBe(0);
        expect(state.registrations).toHaveLength(0);
        expect(state.teams).toHaveLength(0);
        expect(state.players).toHaveLength(0);
        expect(state.users).toHaveLength(0);
    });

    it('P0.3 rejects an expired link without creating resources or consuming a use', async () => {
        const state = createState({
            expiresAt: new Date('2026-07-29T11:59:59.999Z'),
        });
        installInMemoryDatabase(state);

        await expect(register(state)).rejects.toThrow();

        expect(state.invitationLink.usedCount).toBe(0);
        expect(state.users).toHaveLength(0);
        expect(state.players).toHaveLength(0);
        expect(state.teams).toHaveLength(0);
        expect(state.registrations).toHaveLength(0);
    });

    it('P0.4 rejects an inactive link without consuming a use', async () => {
        const state = createState({ isActive: false });
        installInMemoryDatabase(state);

        await expect(register(state)).rejects.toThrow();

        expect(state.invitationLink.usedCount).toBe(0);
        expect(state.registrations).toHaveLength(0);
    });

    describe('P0.5 Championship status gate', () => {
        it('allows registration while the Championship is in registration', async () => {
            const state = createState({
                championshipStatus: 'registration',
            });
            installInMemoryDatabase(state);

            await expect(register(state)).resolves.toBeDefined();
            expect(state.invitationLink.usedCount).toBe(1);
        });

        it.each([
            'draft',
            'in_progress',
            'completed',
            'cancelled',
        ] as const)(
            'rejects registration while the Championship is %s',
            async (championshipStatus) => {
                const state = createState({ championshipStatus });
                installInMemoryDatabase(state);

                await expect(register(state)).rejects.toThrow();

                expect(state.invitationLink.usedCount).toBe(0);
                expect(state.registrations).toHaveLength(0);
            },
        );
    });

    it('P0.6 permits only one concurrent registration when a single use remains', async () => {
        const state = createState({ maxUses: 1, usedCount: 0 });
        installInMemoryDatabase(state, {
            synchronizeInvitationReads: 2,
        });

        const results = await Promise.allSettled([
            register(state, 'concurrent-a'),
            register(state, 'concurrent-b'),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect(state.invitationLink.usedCount).toBe(1);
        expect(state.registrations).toHaveLength(1);
    });
});
