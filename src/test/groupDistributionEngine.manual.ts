import {
    calculateGroupPlan,
    distributeTeamsIntoGroups,
} from '../api/domain/championship/competition';

const cases = [8, 9, 10, 11, 12, 13, 16, 20, 24, 28, 32];

console.log('\nPlanes de grupos:');

cases.forEach((totalTeams) => {
    const plan = calculateGroupPlan(totalTeams, {
        strategy: 'serpentine',
    });

    console.log(`${totalTeams} equipos:`, plan);
});

console.log('\nDistribución serpentine con 10 equipos:');

const teams9 = Array.from({
    length: 21
}, (_, index) => ({
    id: String(index + 1),
    name: `Equipo ${index + 1}`,
    seed: index + 1,
}));

const result9 = distributeTeamsIntoGroups(teams9, {
    strategy: 'serpentine',
    avoidSameClub: true,
});

console.log(JSON.stringify(result9, null, 2));

console.log('\nDistribución serpentine con 12 equipos en 4 grupos de 3:');

