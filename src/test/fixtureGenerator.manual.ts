import {
    distributeTeamsIntoGroups,
    generateFixtureForGroups,
    calculateExpectedMatchesForGroups,
} from '../api/domain/championship/competition';

const teams = Array.from({ length: 8 }, (_, index) => ({
    id: String(index + 1),
    name: `Equipo ${index + 1}`,
    seed: index + 1,
}));

const distribution = distributeTeamsIntoGroups(teams, {
    strategy: 'serpentine',
    avoidSameClub: true,
});

console.log('\nGrupos generados:');

distribution.groups.forEach((group) => {
    console.log(
        `Grupo ${group.name}:`,
        group.teams.map((team) => team.name).join(', ')
    );
});

const fixture = generateFixtureForGroups(distribution.groups, {
    initialMatchNumber: 1,
    includeRoundNumber: true,
});

console.log('\nPartidos generados:');

fixture.matches.forEach((match) => {
    console.log(
        `Partido ${match.matchNumber} | Grupo ${match.groupName} | ${match.teamA.name} vs ${match.teamB.name}`
    );
});

console.log('\nTotal partidos:', fixture.totalMatches);
console.log(
    'Total esperado:',

    calculateExpectedMatchesForGroups(distribution.groups)
);