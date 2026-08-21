import { Types } from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

const paymentMocks = vi.hoisted(() => ({
    generateLink: vi.fn(),
    preferenceCreate: vi.fn(),
}));

vi.mock('../../src/api/config', () => ({
    env: {
        BACKEND_URL: 'https://api.example.test',
        CRYPTO_SECRET: 'public-registration-payment-test-secret',
        FRONTEND_URL_TENANT: 'https://__TENANT__.example.test',
        IMAGE_NO_FOUND: null,
        JWT_SECRET: 'public-registration-payment-jwt-secret',
        NODE_ENV: 'test',
    },
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../src/api/config/env.config', () => ({
    env: {
        BACKEND_URL: 'https://api.example.test',
        CRYPTO_SECRET: 'public-registration-payment-test-secret',
        FRONTEND_URL_TENANT: 'https://__TENANT__.example.test',
        JWT_SECRET: 'public-registration-payment-jwt-secret',
    },
}));

vi.mock('../../src/api/config/logger/WinstonLogger', () => ({
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../src/api/plugin/mercadopago', () => ({
    generate_link: paymentMocks.generateLink,
    getPaymentDetails: vi.fn(),
}));

vi.mock('../../src/api/services/email/email.service', () => ({
    EmailService: class {
        sendTemporaryPasswordEmail = vi.fn().mockResolvedValue(undefined);
    },
}));

vi.mock(
    '../../src/api/domain/championship/rules/championshipCapacity.validator',
    () => ({
        validateChampionshipTeamCapacity: vi.fn().mockResolvedValue(undefined),
    }),
);

vi.mock(
    '../../src/api/domain/championship/rules/competitionRules.validator',
    () => ({
        validateCompetitionRulesForTeam: vi.fn(),
    }),
);

vi.mock('mercadopago', () => ({
    MercadoPagoConfig: class {
        constructor(public readonly options: unknown) {}
    },
    Preference: class {
        create = paymentMocks.preferenceCreate;
    },
    Payment: class {},
}));

import { RegistrationController } from '../../src/api/controllers/championship/register.controller';
import type { IUserCustomRequest } from '../../src/api/interfaces';
import InvitationLink from '../../src/api/models/mongoose/championship/invitationLink';
import Player, {
    BeachVolleyballPosition,
    EPSProvider,
} from '../../src/api/models/mongoose/championship/player';
import Registration from '../../src/api/models/mongoose/championship/registration';
import Team from '../../src/api/models/mongoose/championship/team';
import { User } from '../../src/api/models';
import { PaymentService } from '../../src/api/plugin/mercadopago/service/paymentServiceMp';
import { RegistrationService } from '../../src/api/services/championship/register.service';
import { DatabaseHelper } from '../../src/api/utils/database.helper';
import { PasswordUtil } from '../../src/api/utils';

interface PaymentTestState {
    tenant: string;
    code: string;
    championshipId: Types.ObjectId;
    invitation: {
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
    failAt?: 'user' | 'player' | 'team' | 'registration';
}

const NOW = new Date('2026-07-30T12:00:00.000Z');

function createState(
    overrides: Partial<
        Pick<PaymentTestState['configuration'], 'registrationFee' | 'maxTeams'>
    > & {
        maxUses?: number;
        failAt?: PaymentTestState['failAt'];
    } = {},
): PaymentTestState {
    const championshipId = new Types.ObjectId();
    return {
        tenant: 'tenant-payment',
        code: 'payment-code',
        championshipId,
        invitation: {
            _id: new Types.ObjectId(),
            championshipId,
            code: 'payment-code',
            isActive: true,
            expiresAt: new Date('2026-08-30T12:00:00.000Z'),
            maxUses: overrides.maxUses ?? 5,
            usedCount: 0,
        },
        configuration: {
            _id: new Types.ObjectId(),
            championshipId,
            maxTeams: overrides.maxTeams ?? 8,
            registrationDeadline: new Date('2026-08-15T12:00:00.000Z'),
            registrationFee: overrides.registrationFee ?? 75_000,
            currency: 'COP',
            competitionRules: undefined,
        },
        users: [],
        players: [],
        teams: [],
        registrations: [],
        failAt: overrides.failAt,
    };
}

function registrationData(suffix = 'one') {
    return {
        team: {
            name: `Payment Team ${suffix}`,
        },
        players: [
            {
                nie: `PAY-${suffix}`,
                name: `Player ${suffix}`,
                lastName: 'Payment',
                email: `${suffix}@payment.test`,
                gender: 'female' as const,
                position: BeachVolleyballPosition.DEFENDER,
                eps: EPSProvider.SURA,
            },
        ],
        payerData: {
            name: `Payer ${suffix}`,
            email: `payer-${suffix}@payment.test`,
        },
        price: 1,
    };
}

function modelName(model: unknown) {
    return (model as { modelName?: string }).modelName ?? '';
}

function removeById(
    collection: Array<Record<string, any>>,
    id: string,
) {
    const index = collection.findIndex(
        (document) => document._id.toString() === id,
    );
    return index < 0 ? null : collection.splice(index, 1)[0];
}

function installDatabase(state: PaymentTestState) {
    let capacityReservations = 0;

    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (model, tenant, query: Record<string, any>) => {
            expect(tenant).toBe(state.tenant);
            if (modelName(model) === 'Team') {
                return (
                    state.teams.find(
                        (team) =>
                            team.championshipId?.toString() ===
                                query.championshipId?.toString() &&
                            team.name === query.name,
                    ) ?? null
                ) as never;
            }
            if (modelName(model) === 'User') {
                return (
                    state.users.find(
                        (user) =>
                            user.email === query.email ||
                            (query.nie && user.nie === query.nie),
                    ) ?? null
                ) as never;
            }
            return null;
        },
    );

    vi.spyOn(DatabaseHelper, 'create').mockImplementation(
        async (model, tenant, data: Record<string, any>) => {
            expect(tenant).toBe(state.tenant);
            const name = modelName(model).toLowerCase();
            if (state.failAt === name) {
                throw new Error(`forced ${name} failure`);
            }
            const document = { ...data, _id: data._id ?? new Types.ObjectId() };
            if (modelName(model) === 'User') state.users.push(document);
            if (modelName(model) === 'Player') state.players.push(document);
            if (modelName(model) === 'Team') state.teams.push(document);
            if (modelName(model) === 'Registration') {
                state.registrations.push(document);
            }
            return document as never;
        },
    );

    vi.spyOn(DatabaseHelper, 'update').mockResolvedValue({} as never);
    vi.spyOn(DatabaseHelper, 'delete').mockImplementation(
        async (model, id, tenant) => {
            expect(tenant).toBe(state.tenant);
            const collections: Record<
                string,
                Array<Record<string, any>>
            > = {
                User: state.users,
                Player: state.players,
                Team: state.teams,
                Registration: state.registrations,
            };
            return removeById(collections[modelName(model)] ?? [], id) as never;
        },
    );

    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (model, tenant, query: Record<string, any>, update) => {
            expect(tenant).toBe(state.tenant);

            if (modelName(model) === 'Championship') {
                if (update.$pull?.teams) {
                    capacityReservations = Math.max(
                        0,
                        capacityReservations - 1,
                    );
                    return { _id: state.championshipId } as never;
                }
                if (update.$addToSet?.registrations) {
                    return { _id: state.championshipId } as never;
                }
                if (update.$addToSet?.teams) {
                    if (
                        capacityReservations >=
                        state.configuration.maxTeams
                    ) {
                        return null;
                    }
                    capacityReservations += 1;
                    return { _id: state.championshipId } as never;
                }
                return null;
            }

            if (
                modelName(model) !== modelName(InvitationLink) ||
                query.code !== state.code
            ) {
                return null;
            }

            const increment = update.$inc?.usedCount ?? 0;
            if (increment < 0) {
                state.invitation.usedCount = Math.max(
                    0,
                    state.invitation.usedCount + increment,
                );
                return { ...state.invitation } as never;
            }

            if (
                !state.invitation.isActive ||
                state.invitation.expiresAt <= NOW ||
                state.invitation.usedCount >= state.invitation.maxUses
            ) {
                return null;
            }
            state.invitation.usedCount += increment;
            return { ...state.invitation } as never;
        },
    );
}

function createService(state: PaymentTestState) {
    const service = new RegistrationService();
    vi.spyOn(service, 'validateInitialRegistration').mockResolvedValue({
        invitationLink: state.invitation as never,
        configuration: state.configuration as never,
    });
    return service;
}

async function register(
    state: PaymentTestState,
    suffix = 'one',
) {
    return createService(state).registerTeamUsersAndPlayersWithInvitation(
        state.tenant,
        state.code,
        registrationData(suffix),
    );
}

describe('P0 - public registration and payment', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        vi.spyOn(PasswordUtil, 'hashPassword').mockResolvedValue('hash');
        paymentMocks.generateLink.mockResolvedValue({
            init_point: 'https://mercadopago.test/checkout',
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('creates Team, Player and one pending Registration, then consumes one use', async () => {
        const state = createState();
        installDatabase(state);

        const result = await register(state);

        expect(state.users).toHaveLength(1);
        expect(state.players).toHaveLength(1);
        expect(state.teams).toHaveLength(1);
        expect(state.registrations).toHaveLength(1);
        expect(state.registrations[0]).toMatchObject({
            championshipId: state.championshipId,
            teamId: state.teams[0]._id,
            registrationStatus: 'pending',
            feePaid: false,
        });
        expect(result.paymentLink).toEqual({
            init_point: 'https://mercadopago.test/checkout',
        });
        expect(state.invitation.usedCount).toBe(1);
    });

    it('uses persisted registrationFee and ignores a client-supplied price', async () => {
        const state = createState({ registrationFee: 125_000 });
        installDatabase(state);

        await register(state);

        expect(paymentMocks.generateLink).toHaveBeenCalledWith(
            {},
            null,
            expect.objectContaining({
                price: 125_000,
                currency: 'COP',
            }),
            state.tenant,
            expect.any(Object),
        );
    });

    it('does not read or create registration resources across tenants', async () => {
        const state = createState();
        const findOne = vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
            async (_model, tenant) => {
                expect(tenant).toBe('tenant-b');
                return null;
            },
        );
        const create = vi.spyOn(DatabaseHelper, 'create');
        const service = new RegistrationService();

        await expect(
            service.registerTeamUsersAndPlayersWithInvitation(
                'tenant-b',
                state.code,
                registrationData(),
            ),
        ).rejects.toThrow('Invitation link not found');

        expect(findOne).toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
        expect(paymentMocks.generateLink).not.toHaveBeenCalled();
    });

    it('does not call Mercado Pago for a free registration', async () => {
        const state = createState({ registrationFee: 0 });
        installDatabase(state);

        const result = await register(state);

        expect(paymentMocks.generateLink).not.toHaveBeenCalled();
        expect(result.paymentLink).toBeNull();
        expect(state.registrations[0]).toMatchObject({
            registrationStatus: 'confirmed',
            feePaid: true,
        });
        expect(state.invitation.usedCount).toBe(1);
    });

    it.each(['user', 'player', 'team', 'registration'] as const)(
        'rolls back all resources and does not create payment when %s creation fails',
        async (failAt) => {
            const state = createState({ failAt });
            installDatabase(state);

            await expect(register(state)).rejects.toThrow(
                `forced ${failAt} failure`,
            );

            expect(state.users).toHaveLength(0);
            expect(state.players).toHaveLength(0);
            expect(state.teams).toHaveLength(0);
            expect(state.registrations).toHaveLength(0);
            expect(state.invitation.usedCount).toBe(0);
            expect(paymentMocks.generateLink).not.toHaveBeenCalled();
        },
    );

    it('rolls back resources and invitation use when Mercado Pago fails', async () => {
        const state = createState();
        installDatabase(state);
        paymentMocks.generateLink.mockRejectedValue(
            new Error('Mercado Pago unavailable'),
        );

        await expect(register(state)).rejects.toThrow(
            'Mercado Pago unavailable',
        );

        expect(state.users).toHaveLength(0);
        expect(state.players).toHaveLength(0);
        expect(state.teams).toHaveLength(0);
        expect(state.registrations).toHaveLength(0);
        expect(state.invitation.usedCount).toBe(0);
    });

    it('creates at most one preference when one InvitationLink use remains', async () => {
        const state = createState({ maxUses: 1 });
        installDatabase(state);

        const results = await Promise.allSettled([
            register(state, 'concurrent-a'),
            register(state, 'concurrent-b'),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect(paymentMocks.generateLink).toHaveBeenCalledTimes(1);
        expect(state.registrations).toHaveLength(1);
        expect(state.invitation.usedCount).toBe(1);
    });

    it('permits only one registration and preference for the last Championship slot', async () => {
        const state = createState({ maxTeams: 1 });
        installDatabase(state);

        const results = await Promise.allSettled([
            register(state, 'capacity-a'),
            register(state, 'capacity-b'),
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
        expect(state.teams).toHaveLength(1);
        expect(state.registrations).toHaveLength(1);
        expect(paymentMocks.generateLink).toHaveBeenCalledTimes(1);
        expect(state.invitation.usedCount).toBe(1);
    });

    it('controller exposes init_point as the paymentUrl string', async () => {
        const controller = new RegistrationController();
        Object.assign(controller as object, {
            registrationService: {
                registerTeamUsersAndPlayersWithInvitation: vi.fn().mockResolvedValue({
                    team: { _id: new Types.ObjectId() },
                    players: [],
                    registration: {
                        _id: new Types.ObjectId(),
                        championshipId: new Types.ObjectId(),
                    },
                    paymentLink: {
                        init_point: 'https://mercadopago.test/checkout',
                    },
                }),
            },
            championshipService: {
                addRegistrationId: vi.fn(),
                updateTeamId: vi.fn(),
            },
        });
        const json = vi.fn();
        const status = vi.fn().mockReturnValue({ json });

        await controller.registerTeamUsersAndPlayersWithInvitation(
            {
                params: { code: 'payment-code' },
                clientAccount: 'tenant-payment',
                body: registrationData(),
            } as unknown as IUserCustomRequest,
            { status } as never,
        );

        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    data: expect.objectContaining({
                        paymentUrl: 'https://mercadopago.test/checkout',
                    }),
                }),
            }),
        );
    });
});

describe('P0 - Mercado Pago preference contract', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it('builds a reconcilable preference and returns init_point', async () => {
        paymentMocks.preferenceCreate.mockResolvedValue({
            init_point: 'https://mercadopago.test/preference',
        });
        const service = new PaymentService();
        vi.spyOn(
            service as unknown as {
                getDataAccess(tenant: string): Promise<string>;
            },
            'getDataAccess',
        ).mockResolvedValue('access-token');

        const result = await service.getMercadoPagoLink(
            {
                currency: 'COP',
                price: 90_000,
                description: 'Registration Team P0',
                metadata: {
                    tenant_id: 'tenant-payment',
                    purchase_id: 'registration-id',
                },
            },
            'tenant-payment',
            {
                success: 'https://tenant-payment.example.test/success',
                failure: 'https://tenant-payment.example.test/failure',
                pending: 'https://tenant-payment.example.test/pending',
            },
            {
                name: 'Payer',
                email: 'payer@example.test',
            },
        );

        expect(paymentMocks.preferenceCreate).toHaveBeenCalledWith({
            body: expect.objectContaining({
                items: [
                    expect.objectContaining({
                        title: 'Registration Team P0',
                        unit_price: 90_000,
                        quantity: 1,
                        currency_id: 'COP',
                    }),
                ],
                back_urls: {
                    success: 'https://tenant-payment.example.test/success',
                    failure: 'https://tenant-payment.example.test/failure',
                    pending: 'https://tenant-payment.example.test/pending',
                },
                auto_return: 'approved',
                payer: expect.objectContaining({
                    email: 'payer@example.test',
                }),
                metadata: {
                    tenant_id: 'tenant-payment',
                    purchase_id: 'registration-id',
                },
                notification_url:
                    'https://api.example.test/api/v1/register/tenant/tenant-payment/championship/registration-id/registration/webhook',
            }),
        });
        expect(result).toEqual({
            init_point: 'https://mercadopago.test/preference',
        });
    });
});
