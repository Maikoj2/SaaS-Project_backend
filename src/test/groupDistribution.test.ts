import { Types } from 'mongoose';
import { Logger } from '../api/config/logger';

import Schema from 'mongoose';
import { DistributionGroups } from '../api/models/mongoose/championship/groupsDistrubution';
type Match = {
    home: string;
    away: string;
    round?: string;
    group?: string;
    court?: string;
    startTime?: Date;
    endTime?: Date;
};

type RoundsObject = { [key: number]: Match[] };

interface TeamGroup {
    equipo: string;
    puesto: string;
    grupo: string;
}

type CourtSchedule = { court: string, schedule: Array<{ start: Date; end: Date }> };


interface GruposDistribuidos {
    [key: string]: TeamGroup[];
}

class GroupDistributor {
    private logger: Logger;
    private BREAK_BETWEEN_MATCHES: number;

    constructor() {
        this.logger = new Logger();
        this.BREAK_BETWEEN_MATCHES = 5;
    }
    getBreakBetweenMatches(): number {
        return this.BREAK_BETWEEN_MATCHES;
    }
    setBreakBetweenMatches(breakBetweenMatches: number): void {
        this.BREAK_BETWEEN_MATCHES = breakBetweenMatches;
    }

    generateTeamsNames(cantidad: number): string[] {
        return Array.from({ length: cantidad }, (_, index) => {
            // Convertir número a letra (0=A, 1=B, etc)
            const letra = String.fromCharCode(65 + (index % 26));
            // Si hay más de 26 equipos, agregar número
            const numero = index >= 26 ? Math.floor(index / 26) + 1 : '';
            return `Equipo ${letra}${numero}`;
        });
    }

    private generarPosiciones(cantidad: number): string[] {
        return Array.from({ length: cantidad }, (_, index) => {
            // Determinar el sufijo correcto
            const sufijo = this.obtenerSufijo(index + 1);
            return `${index + 1}.${sufijo} puesto`;
        });
    }

    private obtenerSufijo(numero: number): string {
        if (numero === 1) return 'er';
        if (numero === 2) return 'do';
        if (numero === 3) return 'er';
        return 'º';
    }

    shuffleArray<T>(array: T[]): T[] {
        // Mezcla el array usando el algoritmo de Fisher-Yates
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    teamsDistributionRandom(cantidadEquipos: number, cantidadGrupos: number): GruposDistribuidos {
        // Generar lista de equipos y mezclarlos
        const equipos = this.shuffleArray(this.generateTeamsNames(cantidadEquipos));
        console.log('Equipos generados y mezclados:', equipos);

        const grupos: GruposDistribuidos = {};
        // Generar posiciones dinámicamente
        const posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        const nombresGrupos = Array.from(
            { length: cantidadGrupos },
            (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
        );

        // Inicializar todos los grupos necesarios
        nombresGrupos.forEach(nombreGrupo => {
            grupos[nombreGrupo] = [];
        });

        let equipoIndex = 0;

        // Recorrer por filas (posiciones)
        for (let puestoIndex = 0; puestoIndex < posiciones.length; puestoIndex++) {
            console.log(`\nProcesando fila ${puestoIndex}`);

            // Recorrer grupos en orden lineal
            for (let i = 0; i < cantidadGrupos && equipoIndex < equipos.length; i++) {
                const nombreGrupo = nombresGrupos[i];
                const equipo = equipos[equipoIndex];
                const puesto = posiciones[puestoIndex];

                grupos[nombreGrupo].push({
                    equipo,
                    puesto,
                    grupo: nombreGrupo
                });
                equipoIndex++;
            }
        }

        return grupos;
    }


    teamsDistributionSerpentine(cantidadEquipos: number, cantidadGrupos: number): DistributionGroups {
        // Generar lista de equipos
        const equipos = this.generateTeamsNames(cantidadEquipos);
        console.log('Equipos generados:', equipos);

        const grupos: DistributionGroups = {};
        // Generar posiciones dinámicamente
        const posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        const nombresGrupos = Array.from(
            { length: cantidadGrupos },
            (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
        );

        // Inicializar todos los grupos necesarios
        nombresGrupos.forEach(nombreGrupo => {
            grupos[nombreGrupo] = [];
        });

        let equipoIndex = 0;
        let direccionDerecha = true;

        // Recorrer por filas (posiciones)
        for (let puestoIndex = 0; puestoIndex < posiciones.length; puestoIndex++) {
            console.log(`\nProcesando fila ${puestoIndex}, dirección: ${direccionDerecha ? 'derecha' : 'izquierda'}`);

            // Determinar el orden de los grupos según la dirección
            const gruposIndex = direccionDerecha
                ? Array.from({ length: cantidadGrupos }, (_, i) => i)
                : Array.from({ length: cantidadGrupos }, (_, i) => cantidadGrupos - 1 - i);

            // Recorrer grupos en la dirección actual
            for (let i = 0; i < cantidadGrupos && equipoIndex < equipos.length; i++) {
                const grupoIndex = gruposIndex[i];
                const nombreGrupo = nombresGrupos[grupoIndex];
                const equipo = equipos[equipoIndex];
                const puesto = posiciones[puestoIndex]

                grupos[nombreGrupo].push({
                    teamId: equipo as any,
                    position: parseInt(puesto),
                    group: nombreGrupo
                });
                equipoIndex++;
            }

            // Cambiar dirección para la siguiente fila
            direccionDerecha = !direccionDerecha;
        }

        return grupos;
    }

    teamsDistributionLinearly(cantidadEquipos: number, cantidadGrupos: number): GruposDistribuidos {
        // Generar lista de equipos
        const equipos = this.generateTeamsNames(cantidadEquipos);
        console.log('Equipos generados:', equipos);

        const grupos: GruposDistribuidos = {};
        // Generar posiciones dinámicamente
        const posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        const nombresGrupos = Array.from(
            { length: cantidadGrupos },
            (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
        );

        // Inicializar todos los grupos necesarios
        nombresGrupos.forEach(nombreGrupo => {
            grupos[nombreGrupo] = [];
        });

        let equipoIndex = 0;

        // Recorrer por filas (posiciones)
        for (let puestoIndex = 0; puestoIndex < posiciones.length; puestoIndex++) {
            console.log(`\nProcesando fila ${puestoIndex}`);

            // Recorrer grupos en orden lineal
            for (let i = 0; i < cantidadGrupos && equipoIndex < equipos.length; i++) {
                const nombreGrupo = nombresGrupos[i];
                const equipo = equipos[equipoIndex];
                const puesto = posiciones[puestoIndex];

                grupos[nombreGrupo].push({
                    equipo,
                    puesto,
                    grupo: nombreGrupo
                });
                equipoIndex++;
            }
        }

        return grupos;
    }

    serpentineFormat(cantidadEquipos: number = 10, cantidadGrupos: number = 3) {
        const distribuidor = this.teamsDistributionSerpentine(cantidadEquipos, cantidadGrupos);

        Object.entries(distribuidor).forEach(([nombreGrupo, equipos]) => {
            // console.log(`\n${nombreGrupo}:`);
            // console.table(equipos, ['equipo', 'puesto', 'grupo']);
            const teams = equipos.map(equipo => equipo.teamId);
            const matches = this.generateRoundRobinMatches(teams as any);
            // const scheduledMatches = this.scheduleMatches(matches, courtSchedules);
            const group = {
                name: nombreGrupo,
                teams: teams,
                matches: matches,
                rankings: [],
                status: 'active' as 'active' | 'completed',
            }
            console.log(matches);
            Object.entries(matches).forEach(([round, matches]) => {
                console.log(`Round ${round}:`);
                matches.forEach(match => {
                    console.log(`${match.home} vs ${match.away}`);
                });
            });
        });

        return distribuidor;
    }

    linearFormat(cantidadEquipos: number = 10, cantidadGrupos: number = 3) {
        const distribuidor = this.teamsDistributionLinearly(cantidadEquipos, cantidadGrupos);
        Object.entries(distribuidor).forEach(([nombreGrupo, equipos]) => {
            console.log(`\n${nombreGrupo}:`);
            console.table(equipos, ['equipo', 'puesto', 'grupo']);

        });
    }

    randomFormat(cantidadEquipos: number = 10, cantidadGrupos: number = 3) {
        const distribuidor = this.teamsDistributionRandom(cantidadEquipos, cantidadGrupos);
        Object.entries(distribuidor).forEach(([nombreGrupo, equipos]) => {
            console.log(`\n${nombreGrupo}:`);
            console.table(equipos, ['equipo', 'puesto', 'grupo']);
        });

    }
    generateRoundRobinMatches(teams: string[]): RoundsObject {
        const rounds: RoundsObject = {};
        const numberOfTeams = teams.length;

        // Si el número de equipos es impar, añadimos un "bye"
        if (numberOfTeams % 2 !== 0) {
            teams.push('Bye');
        }

        const totalRounds = teams.length - 1;
        const halfSize = teams.length / 2;

        for (let round = 0; round < totalRounds; round++) {
            const roundMatches: Match[] = [];
            for (let i = 0; i < halfSize; i++) {
                const home = teams[i];
                const away = teams[teams.length - 1 - i];
                if (home !== 'Bye' && away !== 'Bye') {
                    roundMatches.push({ home, away });
                }
            }
            rounds[round + 1] = roundMatches; // Almacena la ronda en el objeto con clave numérica

            // Rotar los equipos (excepto el primero)
            teams.splice(1, 0, teams.pop()!);
        }

        return rounds;
    }
    reorganizeMatchesByRound(groups: { [key: string]: any }): Match[] {
        return Object.entries(groups).flatMap(([groupName, rounds]) => 
            Object.entries(rounds).flatMap(([roundNumber, matches]) => 
                (matches as any[]).map(match => ({
                    ...match,
                    round: `Ronda ${parseInt(roundNumber) }`, // Ronda 1, 2, 3...
                    group: groupName
                }))
            )
        );
    }

     // 1. Nueva función para agrupar partidos por ronda-grupo
     private groupMatchesByRoundGroup(matches: Match[]): Map<string, Match[]> {
        const groups = new Map<string, Match[]>();
        
        matches.forEach(match => {
            const key = `${match.group}-${match.round}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)?.push(match);
        });
        
        return groups;
    }

    // 2. Asignación de horarios por bloques de rondas
    assignTimesToMatches(matches: Match[], startTime: string, intervalMinutes: number): Match[] {
        const roundGroups = this.groupMatchesByRoundGroup(matches);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        let currentTime = new Date();
        currentTime.setHours(startHour, startMinute, 0, 0);

        // Ordenar rondas por número
        const sortedRounds = Array.from(roundGroups.keys()).sort((a, b) => {
            const roundA = parseInt(a.split('-')[1].replace('Ronda ', ''));
            const roundB = parseInt(b.split('-')[1].replace('Ronda ', ''));
            return roundA - roundB;
        });

        // Asignar mismo horario a todos los partidos de la misma ronda-grupo
        sortedRounds.forEach(roundKey => {
            const matchesInRound = roundGroups.get(roundKey) || [];
            const duration = intervalMinutes;
            
            matchesInRound.forEach(match => {
                match.startTime = new Date(currentTime);
                match.endTime = new Date(currentTime.getTime() + duration * 60000);
            });

            // Avanzar el tiempo solo después de procesar toda la ronda
            currentTime = new Date(currentTime.getTime() + (duration + 5) * 60000); // +5 min entre rondas
        });

        return matches;
    }

    

    // 3. Asignación balanceada de canchas por ronda
    assignMatchesToCourts(matches: Match[], courts: CourtSchedule[]): Match[] {
        const courtList = [...courts];
        let currentCourtIndex = 0;

        // Ordenar partidos por horario y grupo
        const sortedMatches = [...matches].sort((a, b) => {
            const timeDiff = a.startTime!.getTime() - b.startTime!.getTime();
            if (timeDiff !== 0) return timeDiff;
            return (a.group || '').localeCompare(b.group || '');
        });

        return sortedMatches.map(match => {
            // Buscar cancha disponible en este horario
            const availableCourt = courtList.find(court => 
                !court.schedule.some(s => 
                    match.startTime! < s.end && 
                    match.endTime! > s.start
                )
            );

            if (availableCourt) {
                availableCourt.schedule.push({
                    start: match.startTime!,
                    end: match.endTime!
                });
                return { ...match, court: availableCourt.court };
            }

            // Rotación circular de canchas si todas están ocupadas
            currentCourtIndex = (currentCourtIndex + 1) % courtList.length;
            const defaultCourt = courtList[currentCourtIndex];
            defaultCourt.schedule.push({
                start: match.startTime!,
                end: match.endTime!
            });
            return { ...match, court: defaultCourt.court };
        });
    }
    printSchedule(matches: Match[]) {
        const scheduleByCourt = matches.reduce((acc, match) => {
            const court = match.court || 'Sin asignar';
            acc[court] = acc[court] || [];
            acc[court].push(match);
            return acc;
        }, {} as Record<string, Match[]>);
        console.log('scheduleByCourt', scheduleByCourt);

        Object.entries(scheduleByCourt).forEach(([court, matches]) => {
            console.log(`\n${court}:`);
            console.table(matches.map(m => ({
                Horario: `${m.startTime?.toLocaleTimeString()} - ${m.endTime?.toLocaleTimeString()}`,
                Partido: `${m.home} vs ${m.away}`,
                Grupo: m.group,
                Ronda: m.round
            })));
        });
    }

}

// Ejemplos de uso:
const distributor = new GroupDistributor();

// Probar con diferentes cantidades
// console.log('\nPrueba con 6 equipos:');
// distributor.testDistribucion(6, 2);

// console.log('\nPrueba con 12 equipos:');
// distributor.testDistribucion(12, 3);

// console.log('\nPrueba con 48 equipos:');
// distributor.serpentineFormat(12, 4); 

console.log('\nPrueba con 32 equipos:');
const groupDistribution = distributor.serpentineFormat( 12, 3

);

console.log('groupDistribution', groupDistribution);

const allGroupMatches: { [key: string]: RoundsObject } = {};

Object.entries(groupDistribution).forEach(([groupName, teams]) => {
    // Extrae los nombres de los equipos
    const teamNames = teams.map(team => team.teamId);

    // Genera los partidos en formato round-robin
    const matches = distributor.generateRoundRobinMatches(teamNames as any);
    console.log('matches', matches);
    // Muestra los partidos generados para cada grupo
    allGroupMatches[groupName] = matches;
});

console.log('allGroupMatches', JSON.stringify(allGroupMatches, null, 2));
//     {
//         "1": [
//             {
//                 "home": "Águilas de Arena",
//                 "away": "Lobos del Oeste"
//             },
//             {
//                 "home": "Orcas Volley",
//                 "away": "Pumas del Sol"
//             }
//         ],
//         "2": [
//             {
//                 "home": "Águilas de Arena",
//                 "away": "Pumas del Sol"
//             },
//             {
//                 "home": "Lobos del Oeste",
//                 "away": "Orcas Volley"
//             }
//         ],
//         "3": [
//             {
//                 "home": "Águilas de Arena",
//                 "away": "Orcas Volley"
//             },
//             {
//                 "home": "Pumas del Sol",
//                 "away": "Lobos del Oeste"
//             }
//         ]
//     },
//     {
//         "1": [
//             {
//                 "home": "Leones de Playa",
//                 "away": "Panteras del Este"
//             },
//             {
//                 "home": "Tiburones Beach",
//                 "away": "Cóndores del Viento"
//             }
//         ],
//         "2": [
//             {
//                 "home": "Leones de Playa",
//                 "away": "Cóndores del Viento"
//             },
//             {
//                 "home": "Panteras del Este",
//                 "away": "Tiburones Beach"
//             }
//         ],
//         "3": [
//             {
//                 "home": "Leones de Playa",
//                 "away": "Tiburones Beach"
//             },
//             {
//                 "home": "Cóndores del Viento",
//                 "away": "Panteras del Este"
//             }
//         ]
//     },
//     {
//         "1": [
//             {
//                 "home": "Tigres del Mar",
//                 "away": "Jaguares del Sur"
//             },
//             {
//                 "home": "Delfines FC",
//                 "away": "Halcones del Norte"
//             }
//         ],
//         "2": [
//             {
//                 "home": "Tigres del Mar",
//                 "away": "Halcones del Norte"
//             },
//             {
//                 "home": "Jaguares del Sur",
//                 "away": "Delfines FC"
//             }
//         ],
//         "3": [
//             {
//                 "home": "Tigres del Mar",
//                 "away": "Delfines FC"
//             },
//             {
//                 "home": "Halcones del Norte",
//                 "away": "Jaguares del Sur"
//             }
//         ]
//     }
// ];


const START_TIME = '08:00';
const INTERVAL_MINUTES = 45;


// 3. Asignar canchas con rotación balanceada
const courtSchedules: CourtSchedule[] = [
    { court: 'Cancha #1', schedule: [] },
    { court: 'Cancha #2', schedule: [] },
    { court: 'Cancha #3', schedule: [] },
    { court: 'Cancha #4', schedule: [] },

];
const organizedMatches = distributor.reorganizeMatchesByRound(allGroupMatches);
console.log('organizedMatches', organizedMatches);

// 2. Asignar horarios por bloques de rondas
const matchesWithTimes = distributor.assignTimesToMatches(organizedMatches, START_TIME, INTERVAL_MINUTES);
console.log('matchesWithTimes', matchesWithTimes);


const finalMatches = distributor.assignMatchesToCourts(matchesWithTimes, courtSchedules);

console.log('finalMatches', finalMatches);
console.log('courtSchedules',  JSON.stringify(courtSchedules, null, 2) );

// 4. Mostrar resultados
distributor.printSchedule(finalMatches);