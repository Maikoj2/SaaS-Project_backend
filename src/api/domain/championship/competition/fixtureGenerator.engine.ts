import {
    CompetitionGroup,
    CompetitionMatch,
    CompetitionTeam,
    FixtureOptions,
    FixtureResult,
} from './competition.types';

export function generateFixtureForGroups(
    groups: CompetitionGroup[],
    options: FixtureOptions = {}
): FixtureResult {
    let currentMatchNumber = options.initialMatchNumber ?? 1;

    const matches: CompetitionMatch[] = [];

    groups.forEach((group) => {
        const groupMatches = generateRoundRobinMatchesForGroup(
            group.name,
            group.teams,
            currentMatchNumber,
            options
        );

        matches.push(...groupMatches);

        currentMatchNumber += groupMatches.length;
    });

    return {
        matches,
        totalMatches: matches.length,
    };
}

export function generateRoundRobinMatchesForGroup(
    groupName: string,
    teams: CompetitionTeam[],
    initialMatchNumber = 1,
    options: FixtureOptions = {}
): CompetitionMatch[] {
    validateGroupTeams(teams, groupName);

    const matches: CompetitionMatch[] = [];
    let matchNumber = initialMatchNumber;

    for (let teamAIndex = 0; teamAIndex < teams.length; teamAIndex++) {
        for (
            let teamBIndex = teamAIndex + 1;
            teamBIndex < teams.length;
            teamBIndex++
        ) {
            const roundNumber = options.includeRoundNumber
                ? calculateRoundNumber(teamAIndex, teamBIndex)
                : undefined;

            matches.push({
                matchNumber,
                roundNumber,
                groupName,
                teamA: teams[teamAIndex],
                teamB: teams[teamBIndex],
                status: 'scheduled',
            });

            matchNumber++;
        }
    }

    return matches;
}

export function calculateExpectedMatchesForGroup(totalTeams: number): number {
    if (totalTeams < 2) {
        return 0;
    }

    return (totalTeams * (totalTeams - 1)) / 2;
}

export function calculateExpectedMatchesForGroups(
    groups: CompetitionGroup[]
): number {
    return groups.reduce(
        (total, group) => total + calculateExpectedMatchesForGroup(group.teams.length),
        0
    );
}

function validateGroupTeams(teams: CompetitionTeam[], groupName: string): void {
    if (teams.length < 2) {
        throw new Error(
            `Group ${groupName} must have at least 2 teams to generate matches.`
        );
    }
}

/**
 * Por ahora es una ronda simple aproximada.
 * Más adelante podemos cambiarlo por round-robin real por jornadas,
 * para evitar que un equipo juegue varias veces en la misma ronda.
 */
function calculateRoundNumber(teamAIndex: number, teamBIndex: number): number {
    return teamBIndex - teamAIndex;
}