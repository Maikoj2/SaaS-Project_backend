import { describe, expect, it } from 'vitest';
import {
    distributeTeamsIntoGroups,
    qualifyTeamsFromGroupStandings,
} from '../../../src/api/domain/championship/competition';
import type {
    CompetitionTeam,
    DistributionStrategy,
    GroupStandingsResult,
    QualificationMode,
} from '../../../src/api/domain/championship/competition';

const teams: CompetitionTeam[] = Array.from({ length: 8 }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Equipo ${index + 1}`,
    seed: index + 1,
}));

const standings: GroupStandingsResult[] = [{
    groupName: 'A',
    standings: [{
        team: teams[0],
        PJ: 1,
        PG: 1,
        PP: 0,
        WO: 0,
        SF: 2,
        SC: 0,
        CS: 2,
        TF: 42,
        TC: 20,
        CT: 2.1,
        PTS: 2,
        POS: 1,
    }],
}];

describe('P0 - Competition engines executable contract', () => {
    it('rejects overallRanking at the qualification engine boundary', () => {
        expect(() => qualifyTeamsFromGroupStandings(standings, {
            mode: 'overallRanking' as QualificationMode,
            totalQualifiers: 1,
        })).toThrow('Unsupported qualification mode: overallRanking');
    });

    it.each(['balanced', 'manual'])(
        'does not execute distribution strategy %s',
        (strategy) => {
            expect(() => distributeTeamsIntoGroups(teams, {
                strategy: strategy as DistributionStrategy,
            })).toThrow();
        },
    );

    it.each(['linear', 'random', 'serpentine', 'balancedByClub'] as const)(
        'executes distribution strategy %s',
        (strategy) => {
            const result = distributeTeamsIntoGroups(teams, { strategy });

            expect(result.groups).toHaveLength(2);
            expect(result.groups.flatMap((group) => group.teams)).toHaveLength(8);
        },
    );
});
