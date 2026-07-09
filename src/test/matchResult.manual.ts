import {
    applyMatchResult,
    BEACH_VOLLEYBALL_RULES,
    calculateMatchResult,
    CompetitionMatch,
    INDOOR_VOLLEYBALL_RULES,
} from '../api/domain/championship/competition';

const match: CompetitionMatch = {
    matchNumber: 1,
    groupName: 'A',
    teamA: {
        id: '1',
        name: 'Equipo 1',
        seed: 1,
    },
    teamB: {
        id: '2',
        name: 'Equipo 2',
        seed: 2,
    },
    status: 'scheduled',
};

function printTitle(title: string) {
    console.log('\n====================================');
    console.log(title);
    console.log('====================================');
}

function runValidCase(title: string, callback: () => unknown) {
    try {
        printTitle(title);
        const result = callback();
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('ERROR NO ESPERADO:', error);
    }
}

function runInvalidCase(title: string, callback: () => unknown) {
    try {
        printTitle(title);
        callback();
        console.error('ERROR: este caso debía fallar, pero pasó.');
    } catch (error) {
        console.log('Error esperado:');
        console.log(error instanceof Error ? error.message : error);
    }
}

/**
 * PLAYA
 * Partido a 2 de 3 sets.
 * Set 1 y 2 a 21.
 * Set 3 tie break a 15.
 */

runValidCase('PLAYA - Resultado válido 2-0 | 21-18, 21-10', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 10,
            },
        ],
    })
);

runValidCase('PLAYA - Resultado válido 2-1 con tie break | 15-13', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 18,
                teamBScore: 21,
            },
            {
                setNumber: 3,
                teamAScore: 15,
                teamBScore: 13,
            },
        ],
    })
);

runValidCase('PLAYA - Set extendido válido | 24-22', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 24,
                teamBScore: 22,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 15,
            },
        ],
    })
);

runValidCase('PLAYA - Aplicar resultado al partido', () =>
    applyMatchResult(
        match,
        [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 10,
            },
        ],
        BEACH_VOLLEYBALL_RULES
    )
);

runValidCase('PLAYA - WO gana Equipo 2 | debe generar 0-21, 0-21', () =>
    applyMatchResult(
        match,
        [],
        BEACH_VOLLEYBALL_RULES,
        '2'
    )
);

/**
 * PISO
 * Partido a 3 de 5 sets.
 * Set 1-4 a 25.
 * Set 5 tie break a 15.
 */

runValidCase('PISO - Resultado válido 3-0 | 25-18, 25-20, 25-22', () =>
    calculateMatchResult({
        match,
        rules: INDOOR_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 25,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 25,
                teamBScore: 20,
            },
            {
                setNumber: 3,
                teamAScore: 25,
                teamBScore: 22,
            },
        ],
    })
);

runValidCase('PISO - Resultado válido 3-2 con tie break | 15-12', () =>
    calculateMatchResult({
        match,
        rules: INDOOR_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 25,
                teamBScore: 20,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 25,
            },
            {
                setNumber: 3,
                teamAScore: 25,
                teamBScore: 23,
            },
            {
                setNumber: 4,
                teamAScore: 23,
                teamBScore: 25,
            },
            {
                setNumber: 5,
                teamAScore: 15,
                teamBScore: 12,
            },
        ],
    })
);

runValidCase('PISO - Set extendido válido | 27-25', () =>
    calculateMatchResult({
        match,
        rules: INDOOR_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 27,
                teamBScore: 25,
            },
            {
                setNumber: 2,
                teamAScore: 25,
                teamBScore: 20,
            },
            {
                setNumber: 3,
                teamAScore: 25,
                teamBScore: 18,
            },
        ],
    })
);

runValidCase('PISO - WO gana Equipo 2 | debe generar 0-25, 0-25, 0-25', () =>
    applyMatchResult(
        match,
        [],
        INDOOR_VOLLEYBALL_RULES,
        '2'
    )
);

/**
 * CASOS INVÁLIDOS
 */

runInvalidCase('INVÁLIDO - Playa set 21-20 no gana por diferencia de 2', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 20,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 10,
            },
        ],
    })
);

runInvalidCase('INVÁLIDO - Playa tie break 14-12 no llega a 15', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 18,
                teamBScore: 21,
            },
            {
                setNumber: 3,
                teamAScore: 14,
                teamBScore: 12,
            },
        ],
    })
);

runInvalidCase('INVÁLIDO - Piso 2 sets ganados no alcanzan para ganar', () =>
    calculateMatchResult({
        match,
        rules: INDOOR_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 25,
                teamBScore: 18,
            },
            {
                setNumber: 2,
                teamAScore: 25,
                teamBScore: 20,
            },
        ],
    })
);

runInvalidCase('INVÁLIDO - Piso set 25-24 no gana por diferencia de 2', () =>
    calculateMatchResult({
        match,
        rules: INDOOR_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 25,
                teamBScore: 24,
            },
            {
                setNumber: 2,
                teamAScore: 25,
                teamBScore: 20,
            },
            {
                setNumber: 3,
                teamAScore: 25,
                teamBScore: 18,
            },
        ],
    })
);

runInvalidCase('INVÁLIDO - Set empatado', () =>
    calculateMatchResult({
        match,
        rules: BEACH_VOLLEYBALL_RULES,
        sets: [
            {
                setNumber: 1,
                teamAScore: 21,
                teamBScore: 21,
            },
            {
                setNumber: 2,
                teamAScore: 21,
                teamBScore: 10,
            },
        ],
    })
);

runInvalidCase('INVÁLIDO - WO con equipo que no pertenece al partido', () =>
    applyMatchResult(
        match,
        [],
        BEACH_VOLLEYBALL_RULES,
        '999'
    )
);