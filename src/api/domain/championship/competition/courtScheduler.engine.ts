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

    const matchDurationMinutes = options.matchDurationMinutes ?? 60;
    const breakMinutes = options.breakMinutes ?? 0;
    const avoidBackToBackMatches = options.avoidBackToBackMatches ?? true;
    const minRestSlots = options.minRestSlots ?? 1;
    const balanceGroups = options.balanceGroups ?? true;

    const pendingMatches = [...matches].sort((a, b) => {
        const roundA = (a as any).roundNumber ?? 0;
        const roundB = (b as any).roundNumber ?? 0;

        if (roundA !== roundB) {
            return roundA - roundB;
        }

        if (a.groupName !== b.groupName) {
            return a.groupName!.localeCompare(b.groupName!);
        }

        return a.matchNumber - b.matchNumber;
    });

    const scheduledMatches: ScheduledMatch[] = [];
    const warnings: string[] = [];

    const lastSlotByTeam = new Map<string, number>();
    const scheduledCountByGroup = new Map<string, number>();
    const scheduledCountByCourt = new Map<string, number>();

    for (const court of options.courts) {
        scheduledCountByCourt.set(court.id, 0);
    }

    let slotIndex = 0;

    while (pendingMatches.length > 0) {
        const currentSlotTeamIds = new Set<string>();

        const courtsOrdered = [...options.courts].sort((a, b) => {
            const countA = scheduledCountByCourt.get(a.id) ?? 0;
            const countB = scheduledCountByCourt.get(b.id) ?? 0;

            if (countA !== countB) {
                return countA - countB;
            }

            return a.name.localeCompare(b.name);
        });

        let scheduledInThisSlot = 0;

        for (const court of courtsOrdered) {
            const matchIndex = findBestMatchIndexForSlot(
                pendingMatches,
                {
                    slotIndex,
                    currentSlotTeamIds,
                    lastSlotByTeam,
                    minRestSlots,
                    avoidBackToBackMatches,
                    balanceGroups,
                    scheduledCountByGroup,
                }
            );

            if (matchIndex === -1) {
                continue;
            }

            const [match] = pendingMatches.splice(matchIndex, 1);

            scheduledMatches.push(
                buildScheduledMatch(
                    match,
                    court,
                    options,
                    slotIndex,
                    matchDurationMinutes,
                    breakMinutes
                )
            );

            currentSlotTeamIds.add(match.teamA.id);
            currentSlotTeamIds.add(match.teamB.id);

            lastSlotByTeam.set(match.teamA.id, slotIndex);
            lastSlotByTeam.set(match.teamB.id, slotIndex);

            scheduledCountByGroup.set(
                match.groupName!,
                (scheduledCountByGroup.get(match.groupName!) ?? 0) + 1
            );

            scheduledCountByCourt.set(
                court.id,
                (scheduledCountByCourt.get(court.id) ?? 0) + 1
            );

            scheduledInThisSlot++;
        }

        if (scheduledInThisSlot === 0) {
            const fallbackMatch = pendingMatches.shift();

            if (!fallbackMatch) {
                break;
            }

            const court = courtsOrdered[0];

            warnings.push(
                `Could not fully respect rest constraints for match ${fallbackMatch.matchNumber}`
            );

            scheduledMatches.push(
                buildScheduledMatch(
                    fallbackMatch,
                    court,
                    options,
                    slotIndex,
                    matchDurationMinutes,
                    breakMinutes
                )
            );

            lastSlotByTeam.set(fallbackMatch.teamA.id, slotIndex);
            lastSlotByTeam.set(fallbackMatch.teamB.id, slotIndex);

            scheduledCountByGroup.set(
                fallbackMatch.groupName!,
                (scheduledCountByGroup.get(fallbackMatch.groupName!) ?? 0) + 1
            );

            scheduledCountByCourt.set(
                court.id,
                (scheduledCountByCourt.get(court.id) ?? 0) + 1
            );
        }

        slotIndex++;
    }

    return {
        matches: scheduledMatches,
        totalMatches: scheduledMatches.length,
        totalSlots: slotIndex,
        warnings,
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

function findBestMatchIndexForSlot(
    matches: CompetitionMatch[],
    context: {
        slotIndex: number;
        currentSlotTeamIds: Set<string>;
        lastSlotByTeam: Map<string, number>;
        minRestSlots: number;
        avoidBackToBackMatches: boolean;
        balanceGroups: boolean;
        scheduledCountByGroup: Map<string, number>;
    }
): number {
    const candidates = matches
        .map((match, index) => ({
            match,
            index,
            score: getMatchScheduleScore(match, context),
        }))
        .filter((candidate) => candidate.score !== Number.POSITIVE_INFINITY)
        .sort((a, b) => {
            if (a.score !== b.score) {
                return a.score - b.score;
            }

            return a.match.matchNumber - b.match.matchNumber;
        });

    if (!candidates.length) {
        return -1;
    }

    return candidates[0].index;
}

function getMatchScheduleScore(
    match: CompetitionMatch,
    context: {
        slotIndex: number;
        currentSlotTeamIds: Set<string>;
        lastSlotByTeam: Map<string, number>;
        minRestSlots: number;
        avoidBackToBackMatches: boolean;
        balanceGroups: boolean;
        scheduledCountByGroup: Map<string, number>;
    }
): number {
    const teamAId = match.teamA.id;
    const teamBId = match.teamB.id;

    if (
        context.currentSlotTeamIds.has(teamAId) ||
        context.currentSlotTeamIds.has(teamBId)
    ) {
        return Number.POSITIVE_INFINITY;
    }

    if (context.avoidBackToBackMatches) {
        const lastSlotTeamA = context.lastSlotByTeam.get(teamAId);
        const lastSlotTeamB = context.lastSlotByTeam.get(teamBId);

        if (
            lastSlotTeamA !== undefined &&
            context.slotIndex - lastSlotTeamA <= context.minRestSlots
        ) {
            return Number.POSITIVE_INFINITY;
        }

        if (
            lastSlotTeamB !== undefined &&
            context.slotIndex - lastSlotTeamB <= context.minRestSlots
        ) {
            return Number.POSITIVE_INFINITY;
        }
    }

    let score = 0;

    if (context.balanceGroups) {
        score += context.scheduledCountByGroup.get(match.groupName!) ?? 0;
    }

    const roundNumber = (match as any).roundNumber ?? 0;
    score += roundNumber * 0.1;

    return score;
}

function buildScheduledMatch(
    match: CompetitionMatch,
    court: Court,
    options: CourtSchedulingOptions,
    slotIndex: number,
    matchDurationMinutes: number,
    breakMinutes: number
): ScheduledMatch {
    const slotNumber = slotIndex + 1;

    return {
        ...match,
        court: court.name,
        courtId: court.id,
        slotNumber,
        date: options.date,
        time: options.startTime
            ? calculateMatchTime(
                options.date!,
                options.startTime,
                slotIndex,
                matchDurationMinutes,
                breakMinutes
            )
            : undefined,
    };
}

function calculateMatchTime(
    date: string,
    startTime: string,
    slotIndex: number,
    matchDurationMinutes: number,
    breakMinutes: number
): string {
    const [hours, minutes] = startTime.split(':').map(Number);

    const startDate = new Date(
        `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00-05:00`
    );

    const minutesToAdd = slotIndex * (matchDurationMinutes + breakMinutes);

    const matchDate = new Date(
        startDate.getTime() + minutesToAdd * 60 * 1000
    );

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(matchDate);
}