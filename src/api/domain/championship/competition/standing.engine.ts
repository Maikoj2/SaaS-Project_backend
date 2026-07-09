import {
    CompetitionMatch,
    CompetitionTeam,
    GroupStandingsResult,
    Standing,
    StandingsOptions,
    TablePointsPolicy,
    VolleyballMatchRules,
} from './competition.types';
import {
    BEACH_VOLLEYBALL_RULES,
    calculateMatchResult,
} from './matchResult.engine';

export const DEFAULT_TABLE_POINTS_POLICY: TablePointsPolicy = {
    winPoints: 2,
    lossPoints: 1,
    walkoverLossPoints: 0,
};

export function calculateStandingsFromMatches(
    matches: CompetitionMatch[],
    options: StandingsOptions = {}
): Standing[] {
    const rules = options.rules ?? BEACH_VOLLEYBALL_RULES;
    const pointsPolicy = options.pointsPolicy ?? DEFAULT_TABLE_POINTS_POLICY;

    const standingsMap = createInitialStandingsMapFromMatches(matches);

    matches.forEach((match) => {
        if (!shouldCountMatch(match)) {
            return;
        }

        applyMatchToStandings(match, standingsMap, rules, pointsPolicy);
    });

    const standings = Array.from(standingsMap.values()).map(recalculateRatios);

    return sortAndAssignPositions(standings);
}

export function calculateStandingsByGroup(
    matches: CompetitionMatch[],
    options: StandingsOptions = {}
): GroupStandingsResult[] {
    const matchesByGroup = groupMatchesByGroupName(matches);

    return Object.entries(matchesByGroup).map(([groupName, groupMatches]) => ({
        groupName,
        standings: calculateStandingsFromMatches(groupMatches, options),
    }));
}

function createInitialStandingsMapFromMatches(
    matches: CompetitionMatch[]
): Map<string, Standing> {
    const standingsMap = new Map<string, Standing>();

    matches.forEach((match) => {
        addTeamToStandingsMap(standingsMap, match.teamA);
        addTeamToStandingsMap(standingsMap, match.teamB);
    });

    return standingsMap;
}

function addTeamToStandingsMap(
    standingsMap: Map<string, Standing>,
    team: CompetitionTeam
): void {
    if (standingsMap.has(team.id)) {
        return;
    }

    standingsMap.set(team.id, {
        team,

        PJ: 0,
        PG: 0,
        PP: 0,
        WO: 0,

        SF: 0,
        SC: 0,
        CS: 0,

        TF: 0,
        TC: 0,
        CT: 0,

        PTS: 0,
    });
}

function shouldCountMatch(match: CompetitionMatch): boolean {
    return match.status === 'finished' || match.status === 'walkover';
}

function applyMatchToStandings(
    match: CompetitionMatch,
    standingsMap: Map<string, Standing>,
    rules: VolleyballMatchRules,
    pointsPolicy: TablePointsPolicy
): void {
    const teamAStanding = standingsMap.get(match.teamA.id);
    const teamBStanding = standingsMap.get(match.teamB.id);

    if (!teamAStanding || !teamBStanding) {
        throw new Error(
            `Cannot calculate standings. Match ${match.matchNumber} has teams not found in standings map.`
        );
    }

    const result = getMatchResultSummaryForStandings(match, rules);

    const teamAWon = result.winnerId === match.teamA.id;
    const teamBWon = result.winnerId === match.teamB.id;

    teamAStanding.PJ += 1;
    teamBStanding.PJ += 1;

    teamAStanding.SF += result.teamASetsWon;
    teamAStanding.SC += result.teamBSetsWon;
    teamAStanding.TF += result.teamAPoints;
    teamAStanding.TC += result.teamBPoints;

    teamBStanding.SF += result.teamBSetsWon;
    teamBStanding.SC += result.teamASetsWon;
    teamBStanding.TF += result.teamBPoints;
    teamBStanding.TC += result.teamAPoints;

    if (teamAWon) {
        applyWin(teamAStanding, pointsPolicy, match.status === 'walkover');
        applyLoss(
            teamBStanding,
            pointsPolicy,
            match.status === 'walkover',
        );
    }

    if (teamBWon) {
        applyWin(teamBStanding, pointsPolicy, match.status === 'walkover');
        applyLoss(
            teamAStanding,
            pointsPolicy,
            match.status === 'walkover',
        );
    }
}

function getMatchResultSummaryForStandings(
    match: CompetitionMatch,
    rules: VolleyballMatchRules
) {
    if (!match.winnerId) {
        throw new Error(
            `Cannot calculate standings. Match ${match.matchNumber} does not have winnerId.`
        );
    }

    if (!match.sets || !match.sets.length) {
        throw new Error(
            `Cannot calculate standings. Match ${match.matchNumber} does not have sets.`
        );
    }

    const result = calculateMatchResult({
        match,
        sets: match.sets,
        rules,
    });

    if (result.winnerId !== match.winnerId) {
        throw new Error(
            `Invalid match ${match.matchNumber}. Calculated winner does not match stored winnerId.`
        );
    }

    return result;
}

function applyWin(
    standing: Standing,
    pointsPolicy: TablePointsPolicy,
    isWalkover: boolean
): void {
    standing.PG += 1;
    standing.PTS += isWalkover
        ? pointsPolicy.walkoverWinPoints ?? pointsPolicy.winPoints
        : pointsPolicy.winPoints;
}

function applyLoss(
    standing: Standing,
    pointsPolicy: TablePointsPolicy,
    isWalkover: boolean
): void {
    standing.PP += 1;

    if (isWalkover) {
        standing.WO += 1;
        standing.PTS += pointsPolicy.walkoverLossPoints;
        return;
    }

    standing.PTS += pointsPolicy.lossPoints;
}

function recalculateRatios(standing: Standing): Standing {
    return {
        ...standing,
        CS: calculateRatio(standing.SF, standing.SC),
        CT: calculateRatio(standing.TF, standing.TC),
    };
}

function calculateRatio(favor: number, against: number): number {
    if (favor === 0 && against === 0) {
        return 0;
    }

    if (against === 0) {
        return Number.POSITIVE_INFINITY;
    }

    return Number((favor / against).toFixed(3));
}

function sortAndAssignPositions(standings: Standing[]): Standing[] {
    const sortedStandings = [...standings].sort(compareStandings);

    return sortedStandings.map((standing, index) => ({
        ...standing,
        POS: index + 1,
    }));
}

function compareStandings(a: Standing, b: Standing): number {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.CS !== a.CS) return b.CS - a.CS;
    if (b.CT !== a.CT) return b.CT - a.CT;
    if (b.PG !== a.PG) return b.PG - a.PG;

    const seedA = a.team.seed ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.team.seed ?? Number.MAX_SAFE_INTEGER;

    if (seedA !== seedB) return seedA - seedB;

    return a.team.name.localeCompare(b.team.name);
}

function groupMatchesByGroupName(
    matches: CompetitionMatch[]
): Record<string, CompetitionMatch[]> {
    return matches.reduce<Record<string, CompetitionMatch[]>>((acc, match) => {
        const groupName = match.groupName ?? 'NO_GROUP';

        if (!acc[groupName]) {
            acc[groupName] = [];
        }

        acc[groupName].push(match);

        return acc;
    }, {});
}