import {
    GroupStandingsResult,
    QualificationOptions,
    QualificationResult,
    QualifiedTeam,
    Standing,
} from './competition.types';

export function qualifyTeamsFromGroupStandings(
    groupStandings: GroupStandingsResult[],
    options: QualificationOptions
): QualificationResult {
    validateQualificationInput(groupStandings, options);

    let qualifiedTeams: QualifiedTeam[];

    switch (options.mode) {
        case 'topPerGroup':
            qualifiedTeams = qualifyTopPerGroup(groupStandings, options.topPerGroup ?? 2);
            break;

        case 'topPerGroupPlusBestThirds':
            qualifiedTeams = qualifyTopPerGroupPlusBestThirds(
                groupStandings,
                options.topPerGroup ?? 2,
                options.bestThirdsCount ?? 0
            );
            break;

        case 'bestOverall':
            qualifiedTeams = qualifyBestOverall(
                groupStandings,
                options.totalQualifiers ?? 8
            );
            break;
        case 'topPerGroupPlusBestRemaining':
            qualifiedTeams = qualifyTopPerGroupPlusBestRemaining(
                groupStandings,
                options.topPerGroup ?? 2,
                options.totalQualifiers ?? 8,
                options.normalizeStandingsForUnevenGroups ?? true
            );
            break;



        default:
            throw new Error(`Unsupported qualification mode: ${options.mode}`);
    }

    const sortedQualifiedTeams = sortQualifiedTeamsOverall(qualifiedTeams).map(
        (qualifiedTeam, index) => ({
            ...qualifiedTeam,
            overallPosition: index + 1,
        })
    );

    return {
        qualifiedTeams: sortedQualifiedTeams,
        totalQualified: sortedQualifiedTeams.length,
    };
}





function validateQualificationInput(
    groupStandings: GroupStandingsResult[],
    options: QualificationOptions
): void {
    if (!groupStandings.length) {
        throw new Error('Cannot qualify teams. Group standings list is empty.');
    }

    groupStandings.forEach((group) => {
        if (!group.standings.length) {
            throw new Error(
                `Cannot qualify teams. Group ${group.groupName} has no standings.`
            );
        }
    });

    if (options.mode === 'topPerGroup' && !options.topPerGroup) {
        throw new Error('topPerGroup is required for topPerGroup mode.');
    }

    if (
        options.mode === 'topPerGroupPlusBestThirds' &&
        !options.topPerGroup
    ) {
        throw new Error(
            'topPerGroup is required for topPerGroupPlusBestThirds mode.'
        );
    }

    if (
        options.mode === 'bestOverall' &&
        !options.totalQualifiers
    ) {
        throw new Error('totalQualifiers is required for bestOverall mode.');
    }
    if (
        options.mode === 'topPerGroupPlusBestRemaining' &&
        !options.topPerGroup
    ) {
        throw new Error(
            'topPerGroup is required for topPerGroupPlusBestRemaining mode.'
        );
    }

    if (
        options.mode === 'topPerGroupPlusBestRemaining' &&
        !options.totalQualifiers
    ) {
        throw new Error(
            'totalQualifiers is required for topPerGroupPlusBestRemaining mode.'
        );
    }
}

function qualifyTopPerGroup(
    groupStandings: GroupStandingsResult[],
    topPerGroup: number
): QualifiedTeam[] {
    const qualifiedTeams: QualifiedTeam[] = [];

    groupStandings.forEach((group) => {
        const selectedTeams = group.standings.slice(0, topPerGroup);

        selectedTeams.forEach((standing) => {
            qualifiedTeams.push(
                mapStandingToQualifiedTeam(
                    standing,
                    group.groupName,
                    standing.POS ?? 0,
                    'TOP_PER_GROUP'
                )
            );
        });
    });

    return qualifiedTeams;
}

function qualifyTopPerGroupPlusBestThirds(
    groupStandings: GroupStandingsResult[],
    topPerGroup: number,
    bestThirdsCount: number
): QualifiedTeam[] {
    const directQualified = qualifyTopPerGroup(groupStandings, topPerGroup);

    if (bestThirdsCount <= 0) {
        return directQualified;
    }

    const thirdPlacedTeams = groupStandings
        .map((group) => {
            const thirdPlace = group.standings.find(
                (standing) => standing.POS === topPerGroup + 1
            );

            if (!thirdPlace) {
                return null;
            }

            return mapStandingToQualifiedTeam(
                thirdPlace,
                group.groupName,
                thirdPlace.POS ?? topPerGroup + 1,
                'BEST_THIRD'
            );
        })
        .filter((team): team is QualifiedTeam => team !== null);

    const bestThirds = sortQualifiedTeamsOverall(thirdPlacedTeams).slice(
        0,
        bestThirdsCount
    );

    return [...directQualified, ...bestThirds];
}

function qualifyBestOverall(
    groupStandings: GroupStandingsResult[],
    totalQualifiers: number
): QualifiedTeam[] {
    const allTeams = groupStandings.flatMap((group) =>
        group.standings.map((standing) =>
            mapStandingToQualifiedTeam(
                standing,
                group.groupName,
                standing.POS ?? 0,
                'BEST_OVERALL'
            )
        )
    );

    return sortQualifiedTeamsOverall(allTeams).slice(0, totalQualifiers);
}

function mapStandingToQualifiedTeam(
    standing: Standing,
    groupName: string,
    groupPosition: number,
    qualificationReason: QualifiedTeam['qualificationReason']
): QualifiedTeam {
    return {
        team: standing.team,
        groupName,
        groupPosition,

        PJ: standing.PJ,
        PG: standing.PG,
        PP: standing.PP,
        WO: standing.WO,

        SF: standing.SF,
        SC: standing.SC,
        CS: standing.CS,

        TF: standing.TF,
        TC: standing.TC,
        CT: standing.CT,

        PTS: standing.PTS,

        qualificationReason,
    };
}

function qualifyTopPerGroupPlusBestRemaining(
    groupStandings: GroupStandingsResult[],
    topPerGroup: number,
    totalQualifiers: number,
    normalizeStandingsForUnevenGroups: boolean
): QualifiedTeam[] {
    const directQualified = qualifyTopPerGroup(
        groupStandings,
        topPerGroup
    );

    if (directQualified.length >= totalQualifiers) {
        return directQualified.slice(0, totalQualifiers);
    }

    const directQualifiedIds = new Set(
        directQualified.map((qualifiedTeam) => qualifiedTeam.team.id)
    );

    const remainingTeams = groupStandings.flatMap((group) =>
        group.standings
            .filter((standing) => !directQualifiedIds.has(standing.team.id))
            .map((standing) =>
                mapStandingToQualifiedTeam(
                    standing,
                    group.groupName,
                    standing.POS ?? 0,
                    'BEST_REMAINING' as QualifiedTeam['qualificationReason']
                )
            )
    );

    const remainingSlots = totalQualifiers - directQualified.length;

    const bestRemaining = sortQualifiedTeamsOverall(
        remainingTeams,
        normalizeStandingsForUnevenGroups
    ).slice(0, remainingSlots);

    return [...directQualified, ...bestRemaining];
}

function sortQualifiedTeamsOverall(
    teams: QualifiedTeam[],
    normalizeStandingsForUnevenGroups = false
): QualifiedTeam[] {
    return [...teams].sort((a, b) =>
        compareQualifiedTeams(a, b, normalizeStandingsForUnevenGroups)
    );
}

function compareQualifiedTeams(
    a: QualifiedTeam,
    b: QualifiedTeam,
    normalizeStandingsForUnevenGroups = false
): number {
    if (normalizeStandingsForUnevenGroups) {
        const aPtsPerMatch = calculatePerMatchValue(a.PTS, a.PJ);
        const bPtsPerMatch = calculatePerMatchValue(b.PTS, b.PJ);

        if (bPtsPerMatch !== aPtsPerMatch) {
            return bPtsPerMatch - aPtsPerMatch;
        }

        if (b.CS !== a.CS) return b.CS - a.CS;
        if (b.CT !== a.CT) return b.CT - a.CT;

        const aWinsPerMatch = calculatePerMatchValue(a.PG, a.PJ);
        const bWinsPerMatch = calculatePerMatchValue(b.PG, b.PJ);

        if (bWinsPerMatch !== aWinsPerMatch) {
            return bWinsPerMatch - aWinsPerMatch;
        }

        if (a.WO !== b.WO) return a.WO - b.WO;
    } else {
        if (b.PTS !== a.PTS) return b.PTS - a.PTS;
        if (b.CS !== a.CS) return b.CS - a.CS;
        if (b.CT !== a.CT) return b.CT - a.CT;
        if (b.PG !== a.PG) return b.PG - a.PG;
    }

    const seedA = a.team.seed ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.team.seed ?? Number.MAX_SAFE_INTEGER;

    if (seedA !== seedB) return seedA - seedB;

    return a.team.name.localeCompare(b.team.name);
}

function calculatePerMatchValue(value: number, matchesPlayed: number): number {
    if (!matchesPlayed) {
        return 0;
    }

    return Number((value / matchesPlayed).toFixed(3));
}