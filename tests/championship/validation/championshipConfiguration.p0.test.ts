import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
    BASE_CREATE_CHAMPIONSHIP_PAYLOAD,
    createChampionshipValidationApp,
} from '../helpers/createChampionshipValidationApp';

const app = createChampionshipValidationApp();

function payload(overrides: Record<string, unknown> = {}) {
    return {
        ...BASE_CREATE_CHAMPIONSHIP_PAYLOAD,
        ...overrides,
    };
}

describe('P0 - Championship configuration validation contract', () => {
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-01T12:00:00.000Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    it('rejects overallRanking because qualification.engine does not support it', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                eliminationSettings: {
                    enabled: true,
                    qualificationMode: 'overallRanking',
                    totalQualifiers: 4,
                    bracketSize: 4,
                },
            }));

        expect(response.status).toBe(422);
    });

    it.each(['balanced', 'manual'])(
        'rejects the non-executable distribution strategy %s',
        async (distributionStrategy) => {
            const response = await request(app)
                .post('/championship')
                .send(payload({ distributionStrategy }));

            expect(response.status).toBe(422);
        },
    );

    it.each(['linear', 'random', 'serpentine', 'balancedByClub'])(
        'accepts the executable distribution strategy %s',
        async (distributionStrategy) => {
            const response = await request(app)
                .post('/championship')
                .send(payload({ distributionStrategy }));

            expect(response.status).toBe(201);
        },
    );

    it('rejects maxSets lower than setsToWin', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                matchRules: {
                    ...BASE_CREATE_CHAMPIONSHIP_PAYLOAD.matchRules,
                    setsToWin: 3,
                    maxSets: 2,
                },
            }));

        expect(response.status).toBe(422);
    });

    it('rejects totalQualifiers greater than maxTeams', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                maxTeams: 8,
                eliminationSettings: {
                    enabled: true,
                    qualificationMode: 'topPerGroup',
                    topPerGroup: 2,
                    totalQualifiers: 16,
                    bracketSize: 16,
                },
            }));

        expect(response.status).toBe(422);
    });

    it('rejects bracketSize different from totalQualifiers under the current service contract', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                eliminationSettings: {
                    enabled: true,
                    qualificationMode: 'topPerGroup',
                    topPerGroup: 2,
                    totalQualifiers: 4,
                    bracketSize: 8,
                },
            }));

        expect(response.status).toBe(422);
    });

    it('accepts registrationDeadline < startDate < endDate', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload());

        expect(response.status).toBe(201);
    });

    it('rejects registrationDeadline equal to startDate', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                registrationDeadline: BASE_CREATE_CHAMPIONSHIP_PAYLOAD.startDate,
            }));

        expect(response.status).toBe(422);
    });

    it('rejects registrationDeadline after startDate', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                registrationDeadline: '2026-08-31T08:00:00.000Z',
            }));

        expect(response.status).toBe(422);
    });

    it.each([
        '2026-08-30T08:00:00.000Z',
        '2026-08-29T08:00:00.000Z',
    ])('rejects endDate %s when it is not after startDate', async (endDate) => {
        const response = await request(app)
            .post('/championship')
            .send(payload({ endDate }));

        expect(response.status).toBe(422);
    });

    it('rejects an indoor preset combined with beach match rules', async () => {
        const response = await request(app)
            .post('/championship')
            .send(payload({
                competitionRulePreset: 'INDOOR_OPEN_6V6',
                matchRules: {
                    ...BASE_CREATE_CHAMPIONSHIP_PAYLOAD.matchRules,
                    volleyballType: 'beach',
                },
            }));

        expect(response.status).toBe(422);
    });
});
