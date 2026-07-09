import {
    applyMatchResult,
    BEACH_VOLLEYBALL_RULES,
    calculateStandingsFromMatches,
    CompetitionMatch,
} from '../api/domain/championship/competition';

const teams = [
    { id: '1', name: 'Equipo 1', seed: 1 },
    { id: '2', name: 'Equipo 2', seed: 2 },
    { id: '3', name: 'Equipo 3', seed: 3 },
    { id: '4', name: 'Equipo 4', seed: 4 },
];

const baseMatches: CompetitionMatch[] = [
    {
        matchNumber: 1,
        groupName: 'A',
        teamA: teams[0],
        teamB: teams[1],
        status: 'scheduled',
    },
    {
        matchNumber: 2,
        groupName: 'A',
        teamA: teams[0],
        teamB: teams[2],
        status: 'scheduled',
    },
    {
        matchNumber: 3,
        groupName: 'A',
        teamA: teams[0],
        teamB: teams[3],
        status: 'scheduled',
    },
    {
        matchNumber: 4,
        groupName: 'A',
        teamA: teams[1],
        teamB: teams[2],
        status: 'scheduled',
    },
    {
        matchNumber: 5,
        groupName: 'A',
        teamA: teams[1],
        teamB: teams[3],
        status: 'scheduled',
    },
    {
        matchNumber: 6,
        groupName: 'A',
        teamA: teams[2],
        teamB: teams[3],
        status: 'scheduled',
    },
];

const finishedMatches: CompetitionMatch[] = [
    applyMatchResult(
        baseMatches[0],
        [
            { setNumber: 1, teamAScore: 21, teamBScore: 18 },
            { setNumber: 2, teamAScore: 21, teamBScore: 10 },
        ],
        BEACH_VOLLEYBALL_RULES
    ),

    applyMatchResult(
        baseMatches[1],
        [
            { setNumber: 1, teamAScore: 18, teamBScore: 21 },
            { setNumber: 2, teamAScore: 21, teamBScore: 19 },
            { setNumber: 3, teamAScore: 15, teamBScore: 13 },
        ],
        BEACH_VOLLEYBALL_RULES
    ),

    applyMatchResult(
        baseMatches[2],
        [],
        BEACH_VOLLEYBALL_RULES,
        '4'
    ),

    applyMatchResult(
        baseMatches[3],
        [
            { setNumber: 1, teamAScore: 21, teamBScore: 19 },
            { setNumber: 2, teamAScore: 18, teamBScore: 21 },
            { setNumber: 3, teamAScore: 13, teamBScore: 15 },
        ],
        BEACH_VOLLEYBALL_RULES
    ),

    applyMatchResult(
        baseMatches[4],
        [
            { setNumber: 1, teamAScore: 21, teamBScore: 17 },
            { setNumber: 2, teamAScore: 21, teamBScore: 15 },
        ],
        BEACH_VOLLEYBALL_RULES
    ),

    applyMatchResult(
        baseMatches[5],
        [
            { setNumber: 1, teamAScore: 16, teamBScore: 21 },
            { setNumber: 2, teamAScore: 21, teamBScore: 19 },
            { setNumber: 3, teamAScore: 12, teamBScore: 15 },
        ],
        BEACH_VOLLEYBALL_RULES
    ),
];

const standings = calculateStandingsFromMatches(finishedMatches, {
    rules: BEACH_VOLLEYBALL_RULES,
    pointsPolicy: {
        winPoints: 2,
        lossPoints: 1,
        walkoverLossPoints: 0,
    },
});

console.log('\nTabla de posiciones Grupo A:\n');

console.table(
    standings.map((standing) => ({
        POS: standing.POS,
        Equipo: standing.team.name,
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
    }))
);