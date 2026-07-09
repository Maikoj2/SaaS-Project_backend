import {
    distributeTeamsIntoGroups,
    generateFixtureForGroups,
    scheduleMatchesOnCourts,
} from '../api/domain/championship/competition';

const teams = Array.from({ length: 16 }, (_, index) => ({
    id: String(index + 1),
    name: `Equipo ${index + 1}`,
    seed: index + 1,
    clubId: 'club-1',
}));

const distribution = distributeTeamsIntoGroups(teams, {
    strategy: 'serpentine',
    avoidSameClub: false,
});

const fixture = generateFixtureForGroups(distribution.groups, {
    initialMatchNumber: 1,
    includeRoundNumber: true,
});

const scheduledFixture = scheduleMatchesOnCourts(fixture.matches, {
    courts: [
        { id: 'court-1', name: 'Cancha 1' },
        { id: 'court-2', name: 'Cancha 2' },
    ],
    date: '2026-07-08',
    startTime: '08:00',
    matchDurationMinutes: 60,
    breakMinutes: 10,
    avoidBackToBackMatches: true,
});

console.log('\nFixture programado por canchas:\n');

scheduledFixture.matches.forEach((match) => {
    console.log(
        `Turno ${match.slotNumber} | ${match.time} | ${match.court} | Partido ${match.matchNumber} | Grupo ${match.groupName} | ${match.teamA.name} vs ${match.teamB.name}`
    );
});

console.log('\nResumen:');
console.log('Total partidos:', scheduledFixture.totalMatches);
console.log('Total turnos:', scheduledFixture.totalSlots);