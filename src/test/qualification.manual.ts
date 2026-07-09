import {
    GroupStandingsResult,
    qualifyTeamsFromGroupStandings,
} from '../api/domain/championship/competition';

const groupStandings: GroupStandingsResult[] = [
    {
        groupName: 'A',
        standings: [
            createStanding('1', 'Equipo 1', 1, 6, 3, 6, 0, 126, 80),
            createStanding('2', 'Equipo 2', 2, 5, 2, 4, 2, 110, 95),
            createStanding('3', 'Equipo 3', 3, 4, 1, 3, 4, 100, 105),
            createStanding('4', 'Equipo 4', 4, 1, 0, 0, 6, 70, 126),
        ],
    },
    {
        groupName: 'B',
        standings: [
            createStanding('5', 'Equipo 5', 1, 6, 3, 6, 1, 130, 90),
            createStanding('6', 'Equipo 6', 2, 5, 2, 5, 3, 120, 100),
            createStanding('7', 'Equipo 7', 3, 3, 1, 2, 5, 90, 120),
            createStanding('8', 'Equipo 8', 4, 2, 0, 1, 6, 85, 130),
        ],
    },
    {
        groupName: 'C',
        standings: [
            createStanding('9', 'Equipo 9', 1, 6, 3, 6, 0, 126, 70),
            createStanding('10', 'Equipo 10', 2, 4, 1, 4, 4, 105, 105),
            createStanding('11', 'Equipo 11', 3, 4, 1, 3, 4, 101, 99),
            createStanding('12', 'Equipo 12', 4, 1, 0, 0, 6, 75, 126),
        ],
    },
    {
        groupName: 'D',
        standings: [
            createStanding('13', 'Equipo 13', 1, 5, 2, 5, 2, 122, 98),
            createStanding('14', 'Equipo 14', 2, 5, 2, 4, 3, 115, 105),
            createStanding('15', 'Equipo 15', 3, 4, 1, 4, 4, 108, 102),
            createStanding('16', 'Equipo 16', 4, 2, 0, 1, 6, 88, 125),
        ],
    },
];

console.log('\nClasifican los 2 primeros de cada grupo:\n');

const topTwo = qualifyTeamsFromGroupStandings(groupStandings, {
    mode: 'topPerGroup',
    topPerGroup: 2,
});

console.table(
    topTwo.qualifiedTeams.map((qualified) => ({
        General: qualified.overallPosition,
        Equipo: qualified.team.name,
        Grupo: qualified.groupName,
        PosGrupo: qualified.groupPosition,
        PTS: qualified.PTS,
        CS: qualified.CS,
        CT: qualified.CT,
        Razon: qualified.qualificationReason,
    }))
);

console.log('\nClasifican 2 primeros + 2 mejores terceros:\n');

const topTwoPlusBestThirds = qualifyTeamsFromGroupStandings(groupStandings, {
    mode: 'topPerGroupPlusBestThirds',
    topPerGroup: 2,
    bestThirdsCount: 2,
});

console.table(
    topTwoPlusBestThirds.qualifiedTeams.map((qualified) => ({
        General: qualified.overallPosition,
        Equipo: qualified.team.name,
        Grupo: qualified.groupName,
        PosGrupo: qualified.groupPosition,
        PTS: qualified.PTS,
        CS: qualified.CS,
        CT: qualified.CT,
        Razon: qualified.qualificationReason,
    }))
);

console.log('\nClasifican mejores 8 de tabla general:\n');

const bestOverall = qualifyTeamsFromGroupStandings(groupStandings, {
    mode: 'bestOverall',
    totalQualifiers: 8,
});

console.table(
    bestOverall.qualifiedTeams.map((qualified) => ({
        General: qualified.overallPosition,
        Equipo: qualified.team.name,
        Grupo: qualified.groupName,
        PosGrupo: qualified.groupPosition,
        PTS: qualified.PTS,
        CS: qualified.CS,
        CT: qualified.CT,
        Razon: qualified.qualificationReason,
    }))
);

function createStanding(
    id: string,
    name: string,
    seed: number,
    PTS: number,
    PG: number,
    SF: number,
    SC: number,
    TF: number,
    TC: number
) {
    return {
        team: {
            id,
            name,
            seed,
        },

        PJ: 3,
        PG,
        PP: 3 - PG,
        WO: 0,

        SF,
        SC,
        CS: calculateRatio(SF, SC),

        TF,
        TC,
        CT: calculateRatio(TF, TC),

        PTS,
        POS: seed <= 4 ? seed : undefined,
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