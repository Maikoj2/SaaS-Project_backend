import { describe, expect, it } from 'vitest';
import type { IConfigurationDocument } from '../../../src/api/models/mongoose/championship/configuration';
import { buildPublicRegistrationRules } from '../../../src/api/domain/championship/rules/publicRegistrationRules';

function configuration(
    overrides: Record<string, unknown> = {}
): IConfigurationDocument {
    return {
        matchRules: { volleyballType: 'beach' },
        competitionRules: {
            genderMode: 'open',
            teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
            categories: { enabled: false, list: [] },
        },
        ...overrides,
    } as unknown as IConfigurationDocument;
}

describe('P0 - public registration rules mapper', () => {
    it('maps beach positions and the persisted 2-4 team size', () => {
        expect(buildPublicRegistrationRules(configuration())).toEqual({
            volleyballType: 'beach',
            allowedPositions: ['BLOCKER', 'DEFENDER'],
            teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
            gender: { mode: 'open' },
            categories: [],
        });
    });

    it.each(['male', 'female'] as const)('maps %s gender without invented minimums', (mode) => {
        const result = buildPublicRegistrationRules(configuration({
            competitionRules: {
                genderMode: mode,
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: { enabled: false, list: [] },
            },
        }));
        expect(result.gender).toEqual({ mode });
    });

    it('maps mixed gender using its real minimums', () => {
        const result = buildPublicRegistrationRules(configuration({
            competitionRules: {
                genderMode: 'mixed',
                mixedRules: { minMalePlayers: 1, minFemalePlayers: 1 },
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: { enabled: false, list: [] },
            },
        }));
        expect(result.gender).toEqual({
            mode: 'mixed',
            minMalePlayers: 1,
            minFemalePlayers: 1,
        });
    });

    it('maps only real indoor positions and its persisted team size', () => {
        const result = buildPublicRegistrationRules(configuration({
            matchRules: { volleyballType: 'indoor' },
            competitionRules: {
                genderMode: 'open',
                teamSize: { minPlayers: 6, maxPlayers: 12, starters: 6 },
                categories: { enabled: false, list: [] },
            },
        }));
        expect(result).toMatchObject({
            volleyballType: 'indoor',
            allowedPositions: ['SETTER', 'OUTSIDE', 'MIDDLE', 'OPPOSITE', 'LIBERO'],
            teamSize: { minPlayers: 6, maxPlayers: 12, starters: 6 },
            gender: { mode: 'open' },
        });
    });

    it('maps category gender and team-size overrides without private fields', () => {
        const result = buildPublicRegistrationRules(configuration({
            competitionRules: {
                genderMode: 'open',
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: {
                    enabled: true,
                    list: [{
                        id: 'mixed-open',
                        name: 'Mixto Libre',
                        genderMode: 'mixed',
                        mixedRules: { minMalePlayers: 1, minFemalePlayers: 1 },
                        teamSize: { minPlayers: 2, maxPlayers: 2, starters: 2 },
                        minAge: 18,
                        maxTeams: 8,
                        privateNote: 'must not leak',
                    }],
                },
            },
        }));
        expect(result.categories).toEqual([{
            id: 'mixed-open',
            name: 'Mixto Libre',
            teamSize: { minPlayers: 2, maxPlayers: 2, starters: 2 },
            gender: {
                mode: 'mixed',
                minMalePlayers: 1,
                minFemalePlayers: 1,
            },
        }]);
        expect(JSON.stringify(result)).not.toContain('privateNote');
        expect(JSON.stringify(result)).not.toContain('minAge');
        expect(JSON.stringify(result)).not.toContain('maxTeams');
    });

    it('returns no categories when the feature is disabled', () => {
        const result = buildPublicRegistrationRules(configuration({
            competitionRules: {
                genderMode: 'open',
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: {
                    enabled: false,
                    list: [{ id: 'private', name: 'Hidden', genderMode: 'open' }],
                },
            },
        }));
        expect(result.categories).toEqual([]);
    });

    it('fails in a controlled way when mixed minimums are missing', () => {
        expect(() => buildPublicRegistrationRules(configuration({
            competitionRules: {
                genderMode: 'mixed',
                teamSize: { minPlayers: 2, maxPlayers: 4, starters: 2 },
                categories: { enabled: false, list: [] },
            },
        }))).toThrow('Invalid public mixed gender configuration');
    });
});
