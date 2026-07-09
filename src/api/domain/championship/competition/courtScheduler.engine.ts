import {
    CompetitionMatch,
    Court,
    CourtScheduleResult,
    CourtSchedulingOptions,
    ScheduledMatch,
} from './competition.types';

export function scheduleMatchesOnCourts(
    matches: CompetitionMatch[],
    options: CourtSchedulingOptions
): CourtScheduleResult {
    validateCourtSchedulingInput(matches, options.courts);

    const scheduledMatches: ScheduledMatch[] = [];

    const orderedMatches = options.avoidBackToBackMatches
        ? reorderMatchesAvoidingBackToBack(matches)
        : [...matches];

    orderedMatches.forEach((match, index) => {
        const courtIndex = index % options.courts.length;
        const slotNumber = Math.floor(index / options.courts.length) + 1;
        const court = options.courts[courtIndex];

        scheduledMatches.push({
            ...match,
            court: court.name,
            courtId: court.id,
            slotNumber,
            date: options.date,
            time: options.startTime
                ? calculateMatchTime(
                    options.startTime,
                    slotNumber,
                    options.matchDurationMinutes ?? 60,
                    options.breakMinutes ?? 0
                )
                : undefined,
        });
    });

    return {
        matches: scheduledMatches,
        totalMatches: scheduledMatches.length,
        totalSlots: Math.ceil(scheduledMatches.length / options.courts.length),
    };
}

function validateCourtSchedulingInput(
    matches: CompetitionMatch[],
    courts: Court[]
): void {
    if (!matches.length) {
        throw new Error('Cannot schedule matches. Match list is empty.');
    }

    if (!courts.length) {
        throw new Error('Cannot schedule matches. At least one court is required.');
    }
}

function calculateMatchTime(
    startTime: string,
    slotNumber: number,
    matchDurationMinutes: number,
    breakMinutes: number
): string {
    const [hours, minutes] = startTime.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);

    const minutesToAdd = (slotNumber - 1) * (matchDurationMinutes + breakMinutes);
    startDate.setMinutes(startDate.getMinutes() + minutesToAdd);

    const resultHours = String(startDate.getHours()).padStart(2, '0');
    const resultMinutes = String(startDate.getMinutes()).padStart(2, '0');

    return `${resultHours}:${resultMinutes}`;
}

/**
 * Primera versión simple.
 * Intenta ordenar partidos para reducir partidos consecutivos
 * del mismo equipo, pero no garantiza solución perfecta.
 */
function reorderMatchesAvoidingBackToBack(
    matches: CompetitionMatch[]
): CompetitionMatch[] {
    const pendingMatches = [...matches];
    const orderedMatches: CompetitionMatch[] = [];

    while (pendingMatches.length > 0) {
        const lastMatch = orderedMatches[orderedMatches.length - 1];

        if (!lastMatch) {
            orderedMatches.push(pendingMatches.shift() as CompetitionMatch);
            continue;
        }

        const nextMatchIndex = pendingMatches.findIndex(
            (match) => !shareAnyTeam(lastMatch, match)
        );

        if (nextMatchIndex === -1) {
            orderedMatches.push(pendingMatches.shift() as CompetitionMatch);
            continue;
        }

        const [nextMatch] = pendingMatches.splice(nextMatchIndex, 1);
        orderedMatches.push(nextMatch);
    }

    return orderedMatches;
}

function shareAnyTeam(
    matchA: CompetitionMatch,
    matchB: CompetitionMatch
): boolean {
    const matchATeamIds = [matchA.teamA.id, matchA.teamB.id];

    return (
        matchATeamIds.includes(matchB.teamA.id) ||
        matchATeamIds.includes(matchB.teamB.id)
    );
}