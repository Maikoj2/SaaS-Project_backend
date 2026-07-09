import {
    advanceBracketMatchWinner,
    generateEliminationBracket,
    QualifiedTeam,
} from '../api/domain/championship/competition';

const qualifiedTeams: QualifiedTeam[] = Array.from(
    { length: 8 },
    (_, index) => ({
        team: {
            id: String(index + 1),
            name: `Equipo ${index + 1}`,
            seed: index + 1,
        },

        groupName: String.fromCharCode(65 + Math.floor(index / 2)),
        groupPosition: index % 2 === 0 ? 1 : 2,
        overallPosition: index + 1,

        PJ: 3,
        PG: 2,
        PP: 1,
        WO: 0,

        SF: 5,
        SC: 2,
        CS: 2.5,

        TF: 120,
        TC: 95,
        CT: 1.263,

        PTS: 5,

        qualificationReason: 'TOP_PER_GROUP',
    })
);

let bracket = generateEliminationBracket(qualifiedTeams, {
    initialMatchNumber: 25,
    includeThirdPlaceMatch: true,
});

printBracket('Bracket inicial', bracket);

bracket = advanceBracketMatchWinner(bracket, 25, '1');
bracket = advanceBracketMatchWinner(bracket, 26, '4');

printBracket('Después de avanzar ganadores de partidos 25 y 26', bracket);

bracket = advanceBracketMatchWinner(bracket, 27, '2');
bracket = advanceBracketMatchWinner(bracket, 28, '3');

printBracket('Después de avanzar todos los ganadores de cuartos', bracket);

bracket = advanceBracketMatchWinner(bracket, 29, '1');
bracket = advanceBracketMatchWinner(bracket, 30, '2');

printBracket('Después de avanzar ganadores de semifinales', bracket);

function printBracket(title: string, currentBracket: typeof bracket) {
    console.log('\n====================================');
    console.log(title);
    console.log('====================================');

    currentBracket.rounds.forEach((round) => {
        console.log(`\n${round.roundLabel}`);

        console.table(
            round.matches.map((match) => ({
                Partido: match.matchNumber,
                EquipoA: match.teamA
                    ? `${match.teamA.team.name} (#${match.teamA.seed})`
                    : 'Pendiente',
                EquipoB: match.teamB
                    ? `${match.teamB.team.name} (#${match.teamB.seed})`
                    : 'Pendiente',
                WinnerTo: match.winnerToMatchNumber ?? '-',
                LoserTo: match.loserToMatchNumber ?? '-',
                Estado: match.status,
            }))
        );
    });
}