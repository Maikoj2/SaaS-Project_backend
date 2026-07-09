import {
    CompetitionMatch,
    MatchResultInput,
    MatchResultSummary,
    SetResult,
    VolleyballMatchRules,
    VolleyballType,
} from './competition.types';

export const BEACH_VOLLEYBALL_RULES: VolleyballMatchRules = {
    volleyballType: 'beach',
    setsToWin: 2,
    maxSets: 3,
    regularSetPoints: 21,
    tieBreakPoints: 15,
    minimumPointDifference: 2,
};

export const INDOOR_VOLLEYBALL_RULES: VolleyballMatchRules = {
    volleyballType: 'indoor',
    setsToWin: 3,
    maxSets: 5,
    regularSetPoints: 25,
    tieBreakPoints: 15,
    minimumPointDifference: 2,
};

export function getDefaultRulesByVolleyballType(
    volleyballType: VolleyballType
): VolleyballMatchRules {
    if (volleyballType === 'beach') {
        return BEACH_VOLLEYBALL_RULES;
    }

    return INDOOR_VOLLEYBALL_RULES;
}

export function calculateMatchResult(
    input: MatchResultInput
): MatchResultSummary {
    const {
        match,
        sets,
        walkoverWinnerId,
        rules = BEACH_VOLLEYBALL_RULES,
    } = input;

    if (walkoverWinnerId) {
        return calculateWalkoverResult(match, walkoverWinnerId, rules);
    }

    validateSets(sets, rules);

    const teamASetsWon = countSetsWonByTeamA(sets);
    const teamBSetsWon = countSetsWonByTeamB(sets);

    validateMatchWinner(teamASetsWon, teamBSetsWon, sets.length, rules);

    const teamAPoints = calculateTeamAPoints(sets);
    const teamBPoints = calculateTeamBPoints(sets);

    const winnerId =
        teamASetsWon > teamBSetsWon ? match.teamA.id : match.teamB.id;

    const loserId =
        winnerId === match.teamA.id ? match.teamB.id : match.teamA.id;

    return {
        teamAId: match.teamA.id,
        teamBId: match.teamB.id,

        teamASetsWon,
        teamBSetsWon,

        teamAPoints,
        teamBPoints,

        winnerId,
        loserId,

        isWalkover: false,
    };
}

export function applyMatchResult(
    match: CompetitionMatch,
    sets: SetResult[],
    rules: VolleyballMatchRules = BEACH_VOLLEYBALL_RULES,
    walkoverWinnerId?: string
): CompetitionMatch {
    const result = calculateMatchResult({
        match,
        sets,
        rules,
        walkoverWinnerId,
    });

    const finalSets =
        result.isWalkover && walkoverWinnerId
            ? buildWalkoverSets(match, walkoverWinnerId, rules)
            : sets;

    return {
        ...match,
        sets: finalSets,
        winnerId: result.winnerId,
        status: result.isWalkover ? 'walkover' : 'finished',
    };
}

function calculateWalkoverResult(
    match: CompetitionMatch,
    walkoverWinnerId: string,
    rules: VolleyballMatchRules
): MatchResultSummary {
    validateWalkoverWinner(match, walkoverWinnerId);

    const loserId =
        walkoverWinnerId === match.teamA.id ? match.teamB.id : match.teamA.id;

    const teamAWinsByWalkover = walkoverWinnerId === match.teamA.id;

    const walkoverPointsPerSet = getWalkoverPointsPerSet(rules);
    const winnerTotalPoints = walkoverPointsPerSet * rules.setsToWin;
    const loserTotalPoints = 0;

    return {
        teamAId: match.teamA.id,
        teamBId: match.teamB.id,

        teamASetsWon: teamAWinsByWalkover ? rules.setsToWin : 0,
        teamBSetsWon: teamAWinsByWalkover ? 0 : rules.setsToWin,

        teamAPoints: teamAWinsByWalkover
            ? winnerTotalPoints
            : loserTotalPoints,

        teamBPoints: teamAWinsByWalkover
            ? loserTotalPoints
            : winnerTotalPoints,

        winnerId: walkoverWinnerId,
        loserId,

        isWalkover: true,
        walkoverLoserId: loserId,
    };
}

function buildWalkoverSets(
    match: CompetitionMatch,
    walkoverWinnerId: string,
    rules: VolleyballMatchRules
): SetResult[] {
    const winnerIsTeamA = walkoverWinnerId === match.teamA.id;
    const walkoverPointsPerSet = getWalkoverPointsPerSet(rules);

    return Array.from({ length: rules.setsToWin }, (_, index) => ({
        setNumber: index + 1,
        teamAScore: winnerIsTeamA ? walkoverPointsPerSet : 0,
        teamBScore: winnerIsTeamA ? 0 : walkoverPointsPerSet,
    }));
}

function getWalkoverPointsPerSet(rules: VolleyballMatchRules): number {
    return rules.regularSetPoints;
}

function validateWalkoverWinner(
    match: CompetitionMatch,
    walkoverWinnerId: string
): void {
    const validTeamIds = [match.teamA.id, match.teamB.id];

    if (!validTeamIds.includes(walkoverWinnerId)) {
        throw new Error(
            `Invalid walkover winner. Team ${walkoverWinnerId} does not belong to this match.`
        );
    }
}

function validateSets(
    sets: SetResult[],
    rules: VolleyballMatchRules
): void {
    if (!sets.length) {
        throw new Error('Cannot calculate match result without sets.');
    }

    if (sets.length > rules.maxSets) {
        throw new Error(
            `A ${rules.volleyballType} match cannot have more than ${rules.maxSets} sets.`
        );
    }

    sets.forEach((set, index) => {
        validateSetNumber(set, index);
        validateSetScore(set);
        validateSetWinningScore(set, index + 1, rules);
    });
}

function validateSetNumber(set: SetResult, expectedIndex: number): void {
    const expectedSetNumber = expectedIndex + 1;

    if (set.setNumber !== expectedSetNumber) {
        throw new Error(
            `Invalid set number. Expected set ${expectedSetNumber}, received ${set.setNumber}.`
        );
    }
}

function validateSetScore(set: SetResult): void {
    if (set.teamAScore === set.teamBScore) {
        throw new Error(
            `Invalid set ${set.setNumber}. A set cannot end in a tie.`
        );
    }

    if (set.teamAScore < 0 || set.teamBScore < 0) {
        throw new Error(
            `Invalid set ${set.setNumber}. Scores cannot be negative.`
        );
    }
}

function validateSetWinningScore(
    set: SetResult,
    setNumber: number,
    rules: VolleyballMatchRules
): void {
    const targetPoints = isTieBreakSet(setNumber, rules)
        ? rules.tieBreakPoints
        : rules.regularSetPoints;

    const winnerScore = Math.max(set.teamAScore, set.teamBScore);
    const loserScore = Math.min(set.teamAScore, set.teamBScore);
    const difference = winnerScore - loserScore;

    if (winnerScore < targetPoints) {
        throw new Error(
            `Invalid set ${set.setNumber}. Winner must reach at least ${targetPoints} points.`
        );
    }

    if (difference < rules.minimumPointDifference) {
        throw new Error(
            `Invalid set ${set.setNumber}. Winner must lead by at least ${rules.minimumPointDifference} points.`
        );
    }
}

function isTieBreakSet(
    setNumber: number,
    rules: VolleyballMatchRules
): boolean {
    return setNumber === rules.maxSets;
}

function countSetsWonByTeamA(sets: SetResult[]): number {
    return sets.filter((set) => set.teamAScore > set.teamBScore).length;
}

function countSetsWonByTeamB(sets: SetResult[]): number {
    return sets.filter((set) => set.teamBScore > set.teamAScore).length;
}

function validateMatchWinner(
    teamASetsWon: number,
    teamBSetsWon: number,
    playedSets: number,
    rules: VolleyballMatchRules
): void {
    const highestSetsWon = Math.max(teamASetsWon, teamBSetsWon);

    if (highestSetsWon < rules.setsToWin) {
        throw new Error(
            `Invalid match result. A team must win ${rules.setsToWin} sets.`
        );
    }

    if (teamASetsWon === teamBSetsWon) {
        throw new Error('Invalid match result. Match cannot end tied.');
    }

    if (teamASetsWon > rules.setsToWin || teamBSetsWon > rules.setsToWin) {
        throw new Error(
            `Invalid match result. A team cannot win more than ${rules.setsToWin} sets.`
        );
    }

    if (playedSets < rules.setsToWin) {
        throw new Error(
            `Invalid match result. A match cannot finish with only ${playedSets} sets.`
        );
    }
}

function calculateTeamAPoints(sets: SetResult[]): number {
    return sets.reduce((total, set) => total + set.teamAScore, 0);
}

function calculateTeamBPoints(sets: SetResult[]): number {
    return sets.reduce((total, set) => total + set.teamBScore, 0);
}