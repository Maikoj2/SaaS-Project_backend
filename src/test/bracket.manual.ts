import {
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

const bracket = generateEliminationBracket(qualifiedTeams, {
    initialMatchNumber: 25,
    includeThirdPlaceMatch: true,
});

console.log('\nLlaves generadas:\n');

bracket.rounds.forEach((round) => {
    console.log(`\n${round.roundLabel}:`);

    round.matches.forEach((match) => {
        const teamA = match.teamA
            ? `${match.teamA.team.name} (#${match.teamA.seed})`
            : `Ganador pendiente`;

        const teamB = match.teamB
            ? `${match.teamB.team.name} (#${match.teamB.seed})`
            : `Ganador pendiente`;

        console.log(
            `Partido ${match.matchNumber} | ${teamA} vs ${teamB}` +
            ` | winnerTo: ${match.winnerToMatchNumber ?? '-'}` +
            ` | loserTo: ${match.loserToMatchNumber ?? '-'}`
        );
    });
});

console.log('\nTotal partidos:', bracket.totalMatches);