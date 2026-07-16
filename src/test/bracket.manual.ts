import {
    GroupStandingsResult,
    Standing,
    qualifyTeamsFromGroupStandings,
    generateEliminationBracket,
} from '../api/domain/championship/competition';

function createStanding(
    teamId: string,
    name: string,
    position: number,
    points: number,
    matchesPlayed: number,
    wins: number,
    setRatio: number,
    pointRatio: number,
    groupName: string
): Standing {
    return {
        team: {
            id: teamId,
            name,
            seed: position,
        },

        PJ: matchesPlayed,
        PG: wins,
        PP: matchesPlayed - wins,
        WO: 0,

        SF: 0,
        SC: 0,
        CS: setRatio,

        TF: 0,
        TC: 0,
        CT: pointRatio,

        PTS: points,
        POS: position,
    };
}

function createGroup(
    groupName: string,
    groupSize: number,
    matchesPlayedPerTeam: number
): GroupStandingsResult {
    const standings: Standing[] = [];

    for (let index = 1; index <= groupSize; index++) {
        const position = index;

        standings.push(
            createStanding(
                `${groupName}${index}`,
                `Equipo ${groupName}${index}`,
                position,
                Math.max(0, 8 - index * 2),
                matchesPlayedPerTeam,
                Math.max(0, matchesPlayedPerTeam - index + 1),
                Number((2.2 - index * 0.25).toFixed(3)),
                Number((1.8 - index * 0.2).toFixed(3)),
                groupName
            )
        );
    }

    return {
        groupName,
        standings,
    };
}

function test20Teams5GroupsOf4Qualify16() {
    console.log('\n===== TEST 20 TEAMS / 5 GROUPS OF 4 / QUALIFY 16 =====');

    const groupStandings: GroupStandingsResult[] = ['A', 'B', 'C', 'D', 'E']
        .map((groupName) => createGroup(groupName, 4, 3));

    const qualification = qualifyTeamsFromGroupStandings(groupStandings, {
        mode: 'topPerGroupPlusBestRemaining',
        topPerGroup: 3,
        totalQualifiers: 16,
        normalizeStandingsForUnevenGroups: true,
    });

    console.log('Total qualified:', qualification.totalQualified);

    qualification.qualifiedTeams.forEach((team) => {
        console.log(
            `${team.overallPosition}. ${team.team.name} | Group ${team.groupName} | Pos ${team.groupPosition} | Reason ${team.qualificationReason} | PTS ${team.PTS} | PJ ${team.PJ}`
        );
    });

    const bracket = generateEliminationBracket(
        qualification.qualifiedTeams,
        {
            includeThirdPlaceMatch: true,
            initialMatchNumber: 1,
        }
    );

    printBracket(bracket);
}

function test22TeamsMixedGroupsQualify16() {
    console.log('\n===== TEST 22 TEAMS / 4 GROUPS OF 4 + 2 GROUPS OF 3 / QUALIFY 16 =====');

    const groupStandings: GroupStandingsResult[] = [
        createGroup('A', 4, 3),
        createGroup('B', 4, 3),
        createGroup('C', 4, 3),
        createGroup('D', 4, 3),
        createGroup('E', 3, 2),
        createGroup('F', 3, 2),
    ];

    const qualification = qualifyTeamsFromGroupStandings(groupStandings, {
        mode: 'topPerGroupPlusBestRemaining',
        topPerGroup: 2,
        totalQualifiers: 16,
        normalizeStandingsForUnevenGroups: true,
    });

    console.log('Total qualified:', qualification.totalQualified);

    qualification.qualifiedTeams.forEach((team) => {
        const ptsPerMatch = team.PJ ? Number((team.PTS / team.PJ).toFixed(3)) : 0;

        console.log(
            `${team.overallPosition}. ${team.team.name} | Group ${team.groupName} | Pos ${team.groupPosition} | Reason ${team.qualificationReason} | PTS ${team.PTS} | PJ ${team.PJ} | PTS/PJ ${ptsPerMatch}`
        );
    });

    const bracket = generateEliminationBracket(
        qualification.qualifiedTeams,
        {
            includeThirdPlaceMatch: true,
            initialMatchNumber: 1,
        }
    );

    printBracket(bracket);
}

function printBracket(bracket: any) {
    console.log('\nBracket total matches:', bracket.totalMatches);

    bracket.rounds.forEach((round: any) => {
        console.log(`\n${round.roundLabel}`);

        round.matches.forEach((match: any) => {
            console.log(
                `Match ${match.matchNumber}: ${match.teamA?.team?.name ?? 'TBD'
                } vs ${match.teamB?.team?.name ?? 'TBD'
                } | winnerTo: ${match.winnerToMatchNumber ?? '-'
                } | loserTo: ${match.loserToMatchNumber ?? '-'
                }`
            );
        });
    });
}

test20Teams5GroupsOf4Qualify16();
test22TeamsMixedGroupsQualify16();