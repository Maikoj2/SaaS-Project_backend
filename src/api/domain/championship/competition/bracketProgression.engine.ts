import {
    BracketMatch,
    BracketResult,
    BracketTeam,
} from './competition.types';

export function advanceBracketMatchWinner(
    bracket: BracketResult,
    completedMatchNumber: number,
    winnerTeamId: string
): BracketResult {
    const bracketCopy = cloneBracket(bracket);

    const completedMatch = findBracketMatch(
        bracketCopy,
        completedMatchNumber
    );

    if (!completedMatch) {
        throw new Error(
            `Cannot advance winner. Match ${completedMatchNumber} was not found.`
        );
    }

    const winner = findTeamInBracketMatch(completedMatch, winnerTeamId);

    if (!winner) {
        throw new Error(
            `Cannot advance winner. Team ${winnerTeamId} does not belong to match ${completedMatchNumber}.`
        );
    }

    const loser = findLoserInBracketMatch(completedMatch, winnerTeamId);

    completedMatch.status = 'finished';

    if (completedMatch.winnerToMatchNumber) {
        const nextMatch = findBracketMatch(
            bracketCopy,
            completedMatch.winnerToMatchNumber
        );

        if (!nextMatch) {
            throw new Error(
                `Cannot advance winner. Destination match ${completedMatch.winnerToMatchNumber} was not found.`
            );
        }

        placeTeamInNextBracketMatch(
            nextMatch,
            completedMatch.matchNumber,
            winner
        );
    }

    if (completedMatch.loserToMatchNumber && loser) {
        const thirdPlaceMatch = findBracketMatch(
            bracketCopy,
            completedMatch.loserToMatchNumber
        );

        if (!thirdPlaceMatch) {
            throw new Error(
                `Cannot advance loser. Destination match ${completedMatch.loserToMatchNumber} was not found.`
            );
        }

        placeTeamInNextBracketMatch(
            thirdPlaceMatch,
            completedMatch.matchNumber,
            loser
        );
    }

    return bracketCopy;
}

export function advanceBracketMatchWinnerByStoredWinner(
    bracket: BracketResult,
    completedMatchNumber: number,
    winnerTeamId: string
): BracketResult {
    return advanceBracketMatchWinner(
        bracket,
        completedMatchNumber,
        winnerTeamId
    );
}

function findBracketMatch(
    bracket: BracketResult,
    matchNumber: number
): BracketMatch | undefined {
    return bracket.rounds
        .flatMap((round) => round.matches)
        .find((match) => match.matchNumber === matchNumber);
}

function findTeamInBracketMatch(
    match: BracketMatch,
    teamId: string
): BracketTeam | undefined {
    if (match.teamA?.team.id === teamId) {
        return match.teamA;
    }

    if (match.teamB?.team.id === teamId) {
        return match.teamB;
    }

    return undefined;
}

function findLoserInBracketMatch(
    match: BracketMatch,
    winnerTeamId: string
): BracketTeam | undefined {
    if (match.teamA && match.teamA.team.id !== winnerTeamId) {
        return match.teamA;
    }

    if (match.teamB && match.teamB.team.id !== winnerTeamId) {
        return match.teamB;
    }

    return undefined;
}

function placeTeamInNextBracketMatch(
    nextMatch: BracketMatch,
    sourceMatchNumber: number,
    team: BracketTeam
): void {
    const sourceSlot = getSourceSlotForNextMatch(
        nextMatch,
        sourceMatchNumber
    );

    if (sourceSlot === 'teamA') {
        nextMatch.teamA = team;
        nextMatch.teamASeed = team.seed;
        return;
    }

    if (sourceSlot === 'teamB') {
        nextMatch.teamB = team;
        nextMatch.teamBSeed = team.seed;
        return;
    }

    if (!nextMatch.teamA) {
        nextMatch.teamA = team;
        nextMatch.teamASeed = team.seed;
        return;
    }

    if (!nextMatch.teamB) {
        nextMatch.teamB = team;
        nextMatch.teamBSeed = team.seed;
        return;
    }

    throw new Error(
        `Cannot place team ${team.team.name}. Match ${nextMatch.matchNumber} is already full.`
    );
}

/**
 * Regla:
 * - El primer partido que alimenta una llave ocupa teamA.
 * - El segundo partido que alimenta una llave ocupa teamB.
 *
 * Ejemplo:
 * Partido 25 winnerTo 29
 * Partido 26 winnerTo 29
 *
 * Ganador de 25 va a teamA de 29.
 * Ganador de 26 va a teamB de 29.
 *
 * Como en este momento el BracketMatch no guarda "sourceMatchNumbers",
 * usamos el orden por matchNumber para ubicar el slot.
 */
function getSourceSlotForNextMatch(
    nextMatch: BracketMatch,
    sourceMatchNumber: number
): 'teamA' | 'teamB' | null {
    if (!nextMatch.teamA && !nextMatch.teamB) {
        return 'teamA';
    }

    if (nextMatch.teamA && !nextMatch.teamB) {
        return 'teamB';
    }

    /**
     * Si ya tiene ambos, intentamos reemplazar según source.
     * Esta parte sirve si recalculas un ganador.
     */
    if (nextMatch.teamA && sourceMatchNumber < nextMatch.matchNumber) {
        return 'teamA';
    }

    return null;
}

function cloneBracket(bracket: BracketResult): BracketResult {
    return JSON.parse(JSON.stringify(bracket));
}