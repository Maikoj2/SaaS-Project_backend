import {
    applyMatchResult,
    BEACH_VOLLEYBALL_RULES,
    calculateGroupPlan,
    calculateStandingsByGroup,
    distributeTeamsIntoGroups,
    generateEliminationBracket,
    generateFixtureForGroups,
    INDOOR_VOLLEYBALL_RULES,
    qualifyTeamsFromGroupStandings,
    scheduleMatchesOnCourts,
} from '../api/domain/championship/competition';

function assert(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(`❌ ${message}`);
    }

    console.log(`✅ ${message}`);
}

function printSection(title: string): void {
    console.log('\n====================================');
    console.log(title);
    console.log('====================================\n');
}

/**
 * 1. PRUEBA DE PLANES DE GRUPOS
 */

printSection('1. Planes de grupos');

const expectedPlans = [
    { teams: 8, groups: 2, sizes: [4, 4] },
    { teams: 9, groups: 3, sizes: [3, 3, 3] },
    { teams: 10, groups: 3, sizes: [4, 3, 3] },
    { teams: 11, groups: 3, sizes: [4, 4, 3] },
    { teams: 12, groups: 3, sizes: [4, 4, 4] },
    { teams: 13, groups: 4, sizes: [4, 3, 3, 3] },
    { teams: 16, groups: 4, sizes: [4, 4, 4, 4] },
    { teams: 20, groups: 5, sizes: [4, 4, 4, 4, 4] },
    { teams: 24, groups: 6, sizes: [4, 4, 4, 4, 4, 4] },
    { teams: 28, groups: 7, sizes: [4, 4, 4, 4, 4, 4, 4] },
    { teams: 32, groups: 8, sizes: [4, 4, 4, 4, 4, 4, 4, 4] },
];

expectedPlans.forEach((expected) => {
    const plan = calculateGroupPlan(expected.teams, {
        strategy: 'serpentine',
    });

    assert(
        plan.numberOfGroups === expected.groups,
        `${expected.teams} equipos deben generar ${expected.groups} grupos`
    );

    assert(
        JSON.stringify(plan.groupSizes) === JSON.stringify(expected.sizes),
        `${expected.teams} equipos deben tener tamaños ${expected.sizes.join(', ')}`
    );
});

const plan12FourGroups = calculateGroupPlan(12, {
    strategy: 'serpentine',
    groupSizePreference: 'preferGroupsOf3',
});

assert(
    plan12FourGroups.numberOfGroups === 4,
    '12 equipos con preferGroupsOf3 deben generar 4 grupos'
);

const plan20FourGroups = calculateGroupPlan(20, {
    strategy: 'serpentine',
    groupSizePreference: 'preferGroupsOf5',
});

assert(
    plan20FourGroups.numberOfGroups === 4,
    '20 equipos con preferGroupsOf5 deben generar 4 grupos'
);

/**
 * 2. PRUEBA DISTRIBUCIÓN
 */

printSection('2. Distribución serpentine');

const teams = Array.from({ length: 32 }, (_, index) => ({
    id: String(index + 1),
    name: `Equipo ${index + 1}`,
    seed: index + 1,
}));

const distribution = distributeTeamsIntoGroups(teams, {
    strategy: 'serpentine',
    numberOfGroups: 8,
    avoidSameClub: true,
});

assert(distribution.groups.length === 8, 'Debe crear 8 grupos');

distribution.groups.forEach((group) => {
    assert(group.teams.length === 4, `Grupo ${group.name} debe tener 4 equipos`);
});

console.table(
    distribution.groups.map((group) => ({
        Grupo: group.name,
        Equipos: group.teams.map((team) => `${team.name} (#${team.seed})`).join(', '),
    }))
);

/**
 * 3. PRUEBA FIXTURE
 */

printSection('3. Fixture todos contra todos');

const fixture = generateFixtureForGroups(distribution.groups, {
    initialMatchNumber: 1,
    includeRoundNumber: true,
});

assert(fixture.totalMatches === 48, '32 equipos en 8 grupos deben generar 48 partidos');

console.table(
    fixture.matches.slice(0, 48).map((match) => ({
        Partido: match.matchNumber,
        Grupo: match.groupName,
        EquipoA: match.teamA.name,
        EquipoB: match.teamB.name,
        Estado: match.status,
    }))
);

/**
 * 4. PRUEBA PROGRAMACIÓN EN CANCHAS
 */

printSection('4. Programación en canchas');

const scheduledFixture = scheduleMatchesOnCourts(fixture.matches, {
    courts: [
        { id: 'court-1', name: 'Cancha 1' },
        { id: 'court-2', name: 'Cancha 2' },
    ],
    date: '2026-07-09',
    startTime: '08:00',
    matchDurationMinutes: 60,
    breakMinutes: 10,
    avoidBackToBackMatches: true,
});

assert(
    scheduledFixture.totalMatches === 48,
    'La programación en canchas debe conservar los 48 partidos'
);

assert(
    scheduledFixture.totalSlots === 24,
    '48 partidos en 2 canchas deben generar 24 turnos'
);

console.table(
    scheduledFixture.matches.slice(0, 24).map((match) => ({
        Turno: match.slotNumber,
        Hora: match.time,
        Cancha: match.court,
        Partido: match.matchNumber,
        Grupo: match.groupName,
        Juego: `${match.teamA.name} vs ${match.teamB.name}`,
    }))
);

/**
 * 5. PRUEBA RESULTADOS PLAYA
 */

printSection('5. Resultados vóley playa');

const beachMatch = fixture.matches[0];

const beachFinished2_0 = applyMatchResult(
    beachMatch,
    [
        { setNumber: 1, teamAScore: 21, teamBScore: 18 },
        { setNumber: 2, teamAScore: 21, teamBScore: 10 },
    ],
    BEACH_VOLLEYBALL_RULES
);

assert(beachFinished2_0.status === 'finished', 'Partido playa 2-0 debe quedar terminado');
assert(beachFinished2_0.winnerId === beachMatch.teamA.id, 'Ganador 2-0 debe ser teamA');

const beachFinished2_1 = applyMatchResult(
    fixture.matches[1],
    [
        { setNumber: 1, teamAScore: 21, teamBScore: 18 },
        { setNumber: 2, teamAScore: 18, teamBScore: 21 },
        { setNumber: 3, teamAScore: 15, teamBScore: 13 },
    ],
    BEACH_VOLLEYBALL_RULES
);

assert(beachFinished2_1.status === 'finished', 'Partido playa 2-1 debe quedar terminado');
assert(beachFinished2_1.winnerId === fixture.matches[1].teamA.id, 'Ganador 2-1 debe ser teamA');

const beachWalkover = applyMatchResult(
    fixture.matches[2],
    [],
    BEACH_VOLLEYBALL_RULES,
    fixture.matches[2].teamB.id
);

assert(beachWalkover.status === 'walkover', 'WO playa debe quedar con status walkover');
assert(beachWalkover.sets?.length === 2, 'WO playa debe generar 2 sets');
assert(beachWalkover.winnerId === fixture.matches[2].teamB.id, 'Ganador WO playa debe ser teamB');

/**
 * 6. PRUEBA RESULTADOS PISO
 */

printSection('6. Resultados vóley piso');

const indoorFinished3_0 = applyMatchResult(
    fixture.matches[3],
    [
        { setNumber: 1, teamAScore: 25, teamBScore: 18 },
        { setNumber: 2, teamAScore: 25, teamBScore: 20 },
        { setNumber: 3, teamAScore: 25, teamBScore: 22 },
    ],
    INDOOR_VOLLEYBALL_RULES
);

assert(indoorFinished3_0.status === 'finished', 'Partido piso 3-0 debe quedar terminado');
assert(indoorFinished3_0.winnerId === fixture.matches[3].teamA.id, 'Ganador piso 3-0 debe ser teamA');

const indoorFinished3_2 = applyMatchResult(
    fixture.matches[4],
    [
        { setNumber: 1, teamAScore: 25, teamBScore: 20 },
        { setNumber: 2, teamAScore: 21, teamBScore: 25 },
        { setNumber: 3, teamAScore: 25, teamBScore: 23 },
        { setNumber: 4, teamAScore: 23, teamBScore: 25 },
        { setNumber: 5, teamAScore: 15, teamBScore: 12 },
    ],
    INDOOR_VOLLEYBALL_RULES
);

assert(indoorFinished3_2.status === 'finished', 'Partido piso 3-2 debe quedar terminado');
assert(indoorFinished3_2.winnerId === fixture.matches[4].teamA.id, 'Ganador piso 3-2 debe ser teamA');

/**
 * 7. PRUEBAS INVÁLIDAS
 */

printSection('7. Validaciones de resultados inválidos');

try {
    applyMatchResult(
        fixture.matches[5],
        [
            { setNumber: 1, teamAScore: 21, teamBScore: 20 },
            { setNumber: 2, teamAScore: 21, teamBScore: 10 },
        ],
        BEACH_VOLLEYBALL_RULES
    );

    throw new Error('Este caso debía fallar y no falló.');
} catch (error) {
    console.log('✅ Playa 21-20 falla correctamente:', error instanceof Error ? error.message : error);
}

try {
    applyMatchResult(
        fixture.matches[5],
        [
            { setNumber: 1, teamAScore: 25, teamBScore: 24 },
            { setNumber: 2, teamAScore: 25, teamBScore: 20 },
            { setNumber: 3, teamAScore: 25, teamBScore: 18 },
        ],
        INDOOR_VOLLEYBALL_RULES
    );

    throw new Error('Este caso debía fallar y no falló.');
} catch (error) {
    console.log('✅ Piso 25-24 falla correctamente:', error instanceof Error ? error.message : error);
}

/**
 * 8. PRUEBA TABLA DE POSICIONES
 *
 * Vamos a terminar todos los partidos con resultados válidos de playa.
 */

printSection('8. Tabla de posiciones');

const finishedBeachMatches = fixture.matches.map((match, index) => {
    if (index % 6 === 2) {
        return applyMatchResult(
            match,
            [],
            BEACH_VOLLEYBALL_RULES,
            match.teamB.id
        );
    }

    if (index % 2 === 0) {
        return applyMatchResult(
            match,
            [
                { setNumber: 1, teamAScore: 21, teamBScore: 18 },
                { setNumber: 2, teamAScore: 21, teamBScore: 15 },
            ],
            BEACH_VOLLEYBALL_RULES
        );
    }

    return applyMatchResult(
        match,
        [
            { setNumber: 1, teamAScore: 18, teamBScore: 21 },
            { setNumber: 2, teamAScore: 21, teamBScore: 19 },
            { setNumber: 3, teamAScore: 15, teamBScore: 13 },
        ],
        BEACH_VOLLEYBALL_RULES
    );
});

const groupStandings = calculateStandingsByGroup(finishedBeachMatches, {
    rules: BEACH_VOLLEYBALL_RULES,
    pointsPolicy: {
        winPoints: 2,
        lossPoints: 1,
        walkoverLossPoints: 0,
    },
});

assert(groupStandings.length === 8, 'Debe calcular tabla para 8 grupos');

groupStandings.forEach((group) => {
    assert(group.standings.length === 4, `Grupo ${group.groupName} debe tener 4 equipos en tabla`);
});

groupStandings.forEach((group) => {
    console.log(`\nTabla Grupo ${group.groupName}`);

    console.table(
        group.standings.map((standing) => ({
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
});

/**
 * 9. PRUEBA CLASIFICACIÓN
 */

printSection('9. Clasificación');

const qualification = qualifyTeamsFromGroupStandings(groupStandings, {
    mode: 'topPerGroup',
    topPerGroup: 2,
});

assert(qualification.totalQualified === 16, 'Deben clasificar 16 equipos: 2 por grupo');

console.table(
    qualification.qualifiedTeams.map((qualified) => ({
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

/**
 * 10. PRUEBA BRACKET
 */

printSection('10. Llaves eliminatorias');

const bracket = generateEliminationBracket(qualification.qualifiedTeams, {
    initialMatchNumber: finishedBeachMatches.length + 1,
    includeThirdPlaceMatch: true,
});

assert(bracket.rounds.length === 5, 'Bracket de 8 con tercer puesto debe tener 8 rondas');
assert(bracket.totalMatches === 16, 'Bracket de 8 con tercer puesto debe tener 16 partidos');

bracket.rounds.forEach((round) => {
    console.log(`\n${round.roundLabel}`);

    console.table(
        round.matches.map((match) => ({
            Partido: match.matchNumber,
            Posicion: match.bracketPosition,
            EquipoA: match.teamA
                ? `${match.teamA.team.name} (#${match.teamA.seed})`
                : 'Pendiente',
            EquipoB: match.teamB
                ? `${match.teamB.team.name} (#${match.teamB.seed})`
                : 'Pendiente',
            WinnerTo: match.winnerToMatchNumber ?? '-',
            LoserTo: match.loserToMatchNumber ?? '-',
        }))
    );
});

printSection('✅ PRUEBA COMPLETA FINALIZADA SIN ERRORES');