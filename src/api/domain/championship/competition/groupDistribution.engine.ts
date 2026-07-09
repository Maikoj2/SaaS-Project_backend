import {
    CompetitionGroup,
    CompetitionTeam,
    DistributionOptions,
    DistributionResult,
    DistributionWarning,
    GroupPlan,
} from './competition.types';

const DEFAULT_MIN_TEAMS = 8;
const DEFAULT_MAX_TEAMS = 32;
const DEFAULT_MAX_TEAMS_PER_GROUP = 4;

export function distributeTeamsIntoGroups(
    teams: CompetitionTeam[],
    options: DistributionOptions
): DistributionResult {
    const warnings: DistributionWarning[] = [];

    validateTeamCount(teams.length, options);

    const groupPlan = calculateGroupPlan(teams.length, options);

    validateGroupCount(groupPlan.numberOfGroups, teams.length);

    const sortedTeams = sortTeamsBySeed(teams);

    let groups: CompetitionGroup[];

    switch (options.strategy) {
        case 'serpentine':
            groups = distributeSerpentine(sortedTeams, groupPlan.numberOfGroups);
            break;

        case 'linear':
            groups = distributeLinear(sortedTeams, groupPlan.numberOfGroups);
            break;

        case 'random':
            groups = distributeLinear(
                shuffleTeams(sortedTeams),
                groupPlan.numberOfGroups
            );
            break;

        case 'balancedByClub':
            groups = distributeBalancedByClub(
                sortedTeams,
                groupPlan.numberOfGroups,
                warnings
            );
            break;

        case 'manual':
            throw new Error('Manual distribution is not implemented yet.');

        default:
            throw new Error(
                `Unsupported distribution strategy: ${options.strategy}`
            );
    }

    if (options.avoidSameClub) {
        warnings.push(...detectSameClubWarnings(groups));
    }

    warnings.push(...detectUnbalancedGroupsWarnings(groups));

    return {
        groups,
        groupPlan,
        warnings,
    };
}

export function calculateGroupPlan(
    totalTeams: number,
    options: DistributionOptions = { strategy: 'serpentine' }
): GroupPlan {
    validateTeamCount(totalTeams, options);

    if (options.numberOfGroups) {
        validateGroupCount(options.numberOfGroups, totalTeams);

        return createFixedGroupPlan(totalTeams, options.numberOfGroups);
    }

    switch (totalTeams) {
        case 8:
            return createFixedGroupPlan(totalTeams, 2);

        case 9:
            return createFixedGroupPlan(totalTeams, 3);

        case 10:
            return createFixedGroupPlan(totalTeams, 3);

        case 11:
            return createFixedGroupPlan(totalTeams, 3);

        case 12:
            if (options.groupSizePreference === 'preferGroupsOf3') {
                return createFixedGroupPlan(totalTeams, 4);
            }

            return createFixedGroupPlan(totalTeams, 3);

        case 13:
            return createFixedGroupPlan(totalTeams, 4);

        case 16:
            return createFixedGroupPlan(totalTeams, 4);

        case 20:
            if (options.groupSizePreference === 'preferGroupsOf5') {
                return createFixedGroupPlan(totalTeams, 4);
            }

            return createFixedGroupPlan(totalTeams, 5);

        case 24:
            return createFixedGroupPlan(totalTeams, 6);

        case 28:
            return createFixedGroupPlan(totalTeams, 7);

        case 32:
            return createFixedGroupPlan(totalTeams, 8);

        default:
            return calculateAutomaticGroupPlan(totalTeams, options);
    }
}

export function getPositionLabel(position: number): string {
    if (position === 1) return '1.er puesto';
    if (position === 2) return '2.do puesto';
    if (position === 3) return '3.er puesto';

    return `${position}.º puesto`;
}

function createFixedGroupPlan(
    totalTeams: number,
    numberOfGroups: number
): GroupPlan {
    return {
        numberOfGroups,
        groupSizes: calculateBalancedGroupSizes(totalTeams, numberOfGroups),
    };
}

function calculateBalancedGroupSizes(
    totalTeams: number,
    numberOfGroups: number
): number[] {
    const baseSize = Math.floor(totalTeams / numberOfGroups);
    const remainder = totalTeams % numberOfGroups;

    return Array.from({ length: numberOfGroups }, (_, index) =>
        index < remainder ? baseSize + 1 : baseSize
    );
}

function calculateAutomaticGroupPlan(
    totalTeams: number,
    options: DistributionOptions
): GroupPlan {
    const maxTeamsPerGroup =
        options.maxTeamsPerGroup ?? DEFAULT_MAX_TEAMS_PER_GROUP;

    const numberOfGroups = Math.ceil(totalTeams / maxTeamsPerGroup);

    return createFixedGroupPlan(totalTeams, numberOfGroups);
}

function validateTeamCount(
    totalTeams: number,
    options: DistributionOptions = { strategy: 'serpentine' }
): void {
    const minTeams = options.minTeams ?? DEFAULT_MIN_TEAMS;
    const maxTeams = options.maxTeams ?? DEFAULT_MAX_TEAMS;

    if (totalTeams < minTeams || totalTeams > maxTeams) {
        throw new Error(
            `Invalid team count. Expected between ${minTeams} and ${maxTeams}, received ${totalTeams}.`
        );
    }
}

function validateGroupCount(numberOfGroups: number, totalTeams: number): void {
    if (numberOfGroups < 2) {
        throw new Error('Invalid group count. At least 2 groups are required.');
    }

    if (numberOfGroups > totalTeams) {
        throw new Error('Invalid group count. Groups cannot be greater than teams.');
    }
}

function sortTeamsBySeed(teams: CompetitionTeam[]): CompetitionTeam[] {
    return [...teams].sort((a, b) => {
        const seedA = a.seed ?? Number.MAX_SAFE_INTEGER;
        const seedB = b.seed ?? Number.MAX_SAFE_INTEGER;

        if (seedA !== seedB) {
            return seedA - seedB;
        }

        return a.name.localeCompare(b.name);
    });
}

function createEmptyGroups(numberOfGroups: number): CompetitionGroup[] {
    return Array.from({ length: numberOfGroups }, (_, index) => ({
        name: getGroupName(index),
        teams: [],
    }));
}

function getGroupName(index: number): string {
    return String.fromCharCode(65 + index);
}

function distributeLinear(
    teams: CompetitionTeam[],
    numberOfGroups: number
): CompetitionGroup[] {
    const groups = createEmptyGroups(numberOfGroups);

    teams.forEach((team, index) => {
        const groupIndex = index % numberOfGroups;
        groups[groupIndex].teams.push(team);
    });

    return groups;
}

/**
 * Distribución serpentine / zig-zag.
 *
 * Ejemplo con 12 equipos y 3 grupos:
 *
 * Fila 1: A <- 1, B <- 2, C <- 3
 * Fila 2: C <- 4, B <- 5, A <- 6
 * Fila 3: A <- 7, B <- 8, C <- 9
 * Fila 4: C <- 10, B <- 11, A <- 12
 */
function distributeSerpentine(
    teams: CompetitionTeam[],
    numberOfGroups: number
): CompetitionGroup[] {
    const groups = createEmptyGroups(numberOfGroups);

    let teamIndex = 0;
    let leftToRight = true;

    while (teamIndex < teams.length) {
        const groupIndexes = leftToRight
            ? Array.from({ length: numberOfGroups }, (_, index) => index)
            : Array.from(
                { length: numberOfGroups },
                (_, index) => numberOfGroups - 1 - index
            );

        for (const groupIndex of groupIndexes) {
            if (teamIndex >= teams.length) break;

            groups[groupIndex].teams.push(teams[teamIndex]);
            teamIndex++;
        }

        leftToRight = !leftToRight;
    }

    return groups;
}

function distributeBalancedByClub(
    teams: CompetitionTeam[],
    numberOfGroups: number,
    warnings: DistributionWarning[]
): CompetitionGroup[] {
    const groups = createEmptyGroups(numberOfGroups);

    teams.forEach((team) => {
        const targetGroup = findBestGroupForTeam(team, groups);

        if (!targetGroup) {
            const fallbackGroup = findSmallestGroup(groups);

            warnings.push({
                code: 'SAME_CLUB_IN_GROUP',
                message: `Team ${team.name} could not be placed without repeating club.`,
                teamId: team.id,
                groupName: fallbackGroup.name,
            });

            fallbackGroup.teams.push(team);
            return;
        }

        targetGroup.teams.push(team);
    });

    return groups;
}

function findBestGroupForTeam(
    team: CompetitionTeam,
    groups: CompetitionGroup[]
): CompetitionGroup | null {
    const sortedGroups = [...groups].sort(
        (a, b) => a.teams.length - b.teams.length
    );

    if (!team.clubId) {
        return sortedGroups[0];
    }

    const groupWithoutSameClub = sortedGroups.find((group) =>
        group.teams.every((currentTeam) => currentTeam.clubId !== team.clubId)
    );

    return groupWithoutSameClub ?? null;
}

function findSmallestGroup(groups: CompetitionGroup[]): CompetitionGroup {
    return [...groups].sort((a, b) => a.teams.length - b.teams.length)[0];
}

function detectSameClubWarnings(
    groups: CompetitionGroup[]
): DistributionWarning[] {
    const warnings: DistributionWarning[] = [];

    groups.forEach((group) => {
        const clubCounter = new Map<string, CompetitionTeam[]>();

        group.teams.forEach((team) => {
            if (!team.clubId) return;

            const currentTeams = clubCounter.get(team.clubId) ?? [];
            currentTeams.push(team);
            clubCounter.set(team.clubId, currentTeams);
        });

        clubCounter.forEach((teamsFromSameClub) => {
            if (teamsFromSameClub.length > 1) {
                teamsFromSameClub.forEach((team) => {
                    warnings.push({
                        code: 'SAME_CLUB_IN_GROUP',
                        message: `Team ${team.name} shares club with another team in group ${group.name}.`,
                        teamId: team.id,
                        groupName: group.name,
                    });
                });
            }
        });
    });

    return warnings;
}

function detectUnbalancedGroupsWarnings(
    groups: CompetitionGroup[]
): DistributionWarning[] {
    const warnings: DistributionWarning[] = [];

    const sizes = groups.map((group) => group.teams.length);
    const maxSize = Math.max(...sizes);
    const minSize = Math.min(...sizes);

    if (maxSize - minSize > 1) {
        warnings.push({
            code: 'UNBALANCED_GROUPS',
            message: `Groups are unbalanced. Smallest group has ${minSize} teams and largest group has ${maxSize} teams.`,
        });
    }

    return warnings;
}

function shuffleTeams(teams: CompetitionTeam[]): CompetitionTeam[] {
    const shuffled = [...teams];

    for (let index = shuffled.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index],
        ];
    }

    return shuffled;
}