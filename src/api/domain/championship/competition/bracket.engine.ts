import {
    BracketMatch,
    BracketOptions,
    BracketResult,
    BracketRound,
    BracketRoundName,
    BracketTeam,
    QualifiedTeam,
} from './competition.types';

export function generateEliminationBracket(
    qualifiedTeams: QualifiedTeam[],
    options: BracketOptions = {}
): BracketResult {
    validateQualifiedTeamsForBracket(qualifiedTeams);

    const bracketSize = calculateBracketSize(qualifiedTeams.length);
    const bracketTeams = mapQualifiedTeamsToBracketTeams(qualifiedTeams);

    const firstRoundSeeds = generateFirstRoundSeedPairs(bracketSize);

    let currentMatchNumber = options.initialMatchNumber ?? 1;

    const firstRoundMatches: BracketMatch[] = firstRoundSeeds.map(
        ([teamASeed, teamBSeed], index) => {
            const teamA = findBracketTeamBySeed(bracketTeams, teamASeed);
            const teamB = findBracketTeamBySeed(bracketTeams, teamBSeed);

            return {
                matchNumber: currentMatchNumber++,
                roundName: getRoundNameByBracketSize(bracketSize),
                roundLabel: getRoundLabelByBracketSize(bracketSize),
                bracketPosition: index + 1,

                teamA,
                teamB,

                teamASeed,
                teamBSeed,

                status: 'scheduled',
            };
        }
    );

    const rounds: BracketRound[] = [
        {
            roundName: getRoundNameByBracketSize(bracketSize),
            roundLabel: getRoundLabelByBracketSize(bracketSize),
            matches: firstRoundMatches,
        },
    ];

    currentMatchNumber = generateNextRounds(
        rounds,
        bracketSize,
        currentMatchNumber,
        options
    );

    linkBracketMatches(rounds);

    return {
        rounds,
        totalMatches: rounds.reduce(
            (total, round) => total + round.matches.length,
            0
        ),
    };
}

function validateQualifiedTeamsForBracket(qualifiedTeams: QualifiedTeam[]): void {
    if (!qualifiedTeams.length) {
        throw new Error('Cannot generate bracket. Qualified teams list is empty.');
    }

    if (qualifiedTeams.length < 2) {
        throw new Error('Cannot generate bracket. At least 2 teams are required.');
    }

    if (qualifiedTeams.length > 32) {
        throw new Error('Cannot generate bracket. Maximum bracket size is 32.');
    }
}

function calculateBracketSize(totalQualifiedTeams: number): number {
    const allowedSizes = [2, 4, 8, 16, 32];

    const bracketSize = allowedSizes.find((size) => size >= totalQualifiedTeams);

    if (!bracketSize) {
        throw new Error(
            `Cannot generate bracket for ${totalQualifiedTeams} teams.`
        );
    }

    return bracketSize;
}

function mapQualifiedTeamsToBracketTeams(
    qualifiedTeams: QualifiedTeam[]
): BracketTeam[] {
    return qualifiedTeams.map((qualifiedTeam, index) => ({
        team: qualifiedTeam.team,
        seed: qualifiedTeam.overallPosition ?? index + 1,
        groupName: qualifiedTeam.groupName,
        groupPosition: qualifiedTeam.groupPosition,
    }));
}

function findBracketTeamBySeed(
    bracketTeams: BracketTeam[],
    seed: number
): BracketTeam | undefined {
    return bracketTeams.find((team) => team.seed === seed);
}

/**
 * Genera parejas estándar:
 * 8 equipos:
 * 1 vs 8
 * 4 vs 5
 * 2 vs 7
 * 3 vs 6
 *
 * Se usa este orden para que en semifinales no se crucen 1 vs 2 temprano.
 */
function generateFirstRoundSeedPairs(bracketSize: number): Array<[number, number]> {
    if (bracketSize === 2) {
        return [[1, 2]];
    }

    let pairs: Array<[number, number]> = [[1, 2]];

    while (pairs.length * 2 < bracketSize) {
        const nextSize = pairs.length * 4;
        const complement = nextSize + 1;

        pairs = pairs.flatMap(([a, b]) => [
            [a, complement - a],
            [b, complement - b],
        ]);
    }

    return pairs;
}

function generateNextRounds(
    rounds: BracketRound[],
    bracketSize: number,
    currentMatchNumber: number,
    options: BracketOptions
): number {
    let currentRoundSize = bracketSize / 2;

    while (currentRoundSize > 1) {
        currentRoundSize = currentRoundSize / 2;

        const roundName = getRoundNameByMatchCount(currentRoundSize);
        const roundLabel = getRoundLabelByName(roundName);

        const matches: BracketMatch[] = Array.from(
            { length: currentRoundSize },
            (_, index) => ({
                matchNumber: currentMatchNumber++,
                roundName,
                roundLabel,
                bracketPosition: index + 1,
                status: 'scheduled',
            })
        );

        rounds.push({
            roundName,
            roundLabel,
            matches,
        });
    }

    if (options.includeThirdPlaceMatch && bracketSize >= 4) {
        const thirdPlaceRound: BracketRound = {
            roundName: 'third_place',
            roundLabel: 'Tercer puesto',
            matches: [
                {
                    matchNumber: currentMatchNumber++,
                    roundName: 'third_place',
                    roundLabel: 'Tercer puesto',
                    bracketPosition: 1,
                    status: 'scheduled',
                },
            ],
        };

        rounds.splice(rounds.length - 1, 0, thirdPlaceRound);
    }

    return currentMatchNumber;
}

function linkBracketMatches(rounds: BracketRound[]): void {
    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
        const currentRound = rounds[roundIndex];

        if (currentRound.roundName === 'third_place') {
            continue;
        }

        const nextRound = findNextWinnerRound(rounds, roundIndex);

        if (!nextRound) {
            continue;
        }

        currentRound.matches.forEach((match, index) => {
            const nextMatchIndex = Math.floor(index / 2);
            const nextMatch = nextRound.matches[nextMatchIndex];

            if (nextMatch) {
                match.winnerToMatchNumber = nextMatch.matchNumber;
            }
        });
    }

    linkSemifinalLosersToThirdPlace(rounds);
}

function findNextWinnerRound(
    rounds: BracketRound[],
    currentRoundIndex: number
): BracketRound | undefined {
    return rounds
        .slice(currentRoundIndex + 1)
        .find((round) => round.roundName !== 'third_place');
}

function linkSemifinalLosersToThirdPlace(rounds: BracketRound[]): void {
    const semifinalRound = rounds.find(
        (round) => round.roundName === 'semifinal'
    );

    const thirdPlaceRound = rounds.find(
        (round) => round.roundName === 'third_place'
    );

    if (!semifinalRound || !thirdPlaceRound) {
        return;
    }

    semifinalRound.matches.forEach((match) => {
        match.loserToMatchNumber = thirdPlaceRound.matches[0].matchNumber;
    });
}

function getRoundNameByBracketSize(bracketSize: number): BracketRoundName {
    switch (bracketSize) {
        case 32:
            return 'round_of_32';
        case 16:
            return 'round_of_16';
        case 8:
            return 'quarterfinal';
        case 4:
            return 'semifinal';
        case 2:
            return 'final';
        default:
            throw new Error(`Unsupported bracket size: ${bracketSize}`);
    }
}

function getRoundLabelByBracketSize(bracketSize: number): string {
    return getRoundLabelByName(getRoundNameByBracketSize(bracketSize));
}

function getRoundNameByMatchCount(matchCount: number): BracketRoundName {
    switch (matchCount) {
        case 16:
            return 'round_of_32';
        case 8:
            return 'round_of_16';
        case 4:
            return 'quarterfinal';
        case 2:
            return 'semifinal';
        case 1:
            return 'final';
        default:
            throw new Error(`Unsupported match count: ${matchCount}`);
    }
}

function getRoundLabelByName(roundName: BracketRoundName): string {
    switch (roundName) {
        case 'round_of_32':
            return 'Ronda de 32';
        case 'round_of_16':
            return 'Octavos';
        case 'quarterfinal':
            return 'Cuartos';
        case 'semifinal':
            return 'Semifinal';
        case 'third_place':
            return 'Tercer puesto';
        case 'final':
            return 'Final';
        default:
            return roundName;
    }
}