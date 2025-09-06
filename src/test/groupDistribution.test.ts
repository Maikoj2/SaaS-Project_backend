import { Logger } from '../api/config/logger';
type Match = { home: string, away: string, court?: string, startTime?: string, endTime?: string };
type RoundsObject = { [key: number]: Match[] };

interface TeamGroup {
    equipo: string;
    puesto: string;
    grupo: string;
}

type CourtSchedule = { court: string, times: string[] };


interface GruposDistribuidos {
    [key: string]: TeamGroup[];
}

class GroupDistributor {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
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

        let grupos: GruposDistribuidos = {};
        // Generar posiciones dinámicamente
        let posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        let nombresGrupos = Array.from(
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


    teamsDistributionSerpentine(cantidadEquipos: number, cantidadGrupos: number): GruposDistribuidos {
        // Generar lista de equipos
        const equipos = this.generateTeamsNames(cantidadEquipos);
        console.log('Equipos generados:', equipos);

        let grupos: GruposDistribuidos = {};
        // Generar posiciones dinámicamente
        let posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        let nombresGrupos = Array.from(
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
            let gruposIndex = direccionDerecha
                ? Array.from({ length: cantidadGrupos }, (_, i) => i)
                : Array.from({ length: cantidadGrupos }, (_, i) => cantidadGrupos - 1 - i);

            // Recorrer grupos en la dirección actual
            for (let i = 0; i < cantidadGrupos && equipoIndex < equipos.length; i++) {
                const grupoIndex = gruposIndex[i];
                const nombreGrupo = nombresGrupos[grupoIndex];
                const equipo = equipos[equipoIndex];
                const puesto = posiciones[puestoIndex];

                grupos[nombreGrupo].push({
                    equipo,
                    puesto,
                    grupo: nombreGrupo
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

        let grupos: GruposDistribuidos = {};
        // Generar posiciones dinámicamente
        let posiciones = this.generarPosiciones(Math.ceil(cantidadEquipos / cantidadGrupos));
        let nombresGrupos = Array.from(
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
            const teams = equipos.map(equipo => equipo.equipo);
            const matches = this.generateRoundRobinMatches(teams);
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
    
    assignMatchesToCourts(matches: Match[], courts: CourtSchedule[]): Match[] {
        return matches.map((match, index) => {
            match.court = courts[index % courts.length].court;
            return match;
        });
    }
    reorganizeMatchesByRound(matchesId: RoundsObject[]): Match[] {
        const allMatches: Match[] = [];

        matchesId.forEach(groupRounds => {
            Object.entries(groupRounds).forEach(([round, matches]) => {

                allMatches.push(...matches);
            });
        });

        return allMatches;
    }
    assignTimesToMatches(matches: Match[], startTime: string, intervalMinutes: number): Match[] {
        const start = new Date(`2025-01-12T${startTime}:00`);
        return matches.map((match, index) => {
            const matchTime = new Date(start.getTime() + Math.floor(index / 2) * intervalMinutes * 60000);
const hours = matchTime.getHours().toString().padStart(2, '0');
const minutes = matchTime.getMinutes().toString().padStart(2, '0');

// Calcula el tiempo de fin sumando el intervalo
const endTime = new Date(matchTime.getTime() + intervalMinutes * 60000);
const endHours = endTime.getHours().toString().padStart(2, '0');
const endMinutes = endTime.getMinutes().toString().padStart(2, '0');

match.startTime = `${hours}:${minutes}`;
match.endTime = `${endHours}:${endMinutes}`;

            return match;
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

console.log('\nPrueba con 12 equipos:');
// distributor.serpentineFormat(32, 8); 

const matches: RoundsObject[] = [
    {
        "1": [
            {
                "home": "Águilas de Arena",
                "away": "Lobos del Oeste"
            },
            {
                "home": "Orcas Volley",
                "away": "Pumas del Sol"
            }
        ],
        "2": [
            {
                "home": "Águilas de Arena",
                "away": "Pumas del Sol"
            },
            {
                "home": "Lobos del Oeste",
                "away": "Orcas Volley"
            }
        ],
        "3": [
            {
                "home": "Águilas de Arena",
                "away": "Orcas Volley"
            },
            {
                "home": "Pumas del Sol",
                "away": "Lobos del Oeste"
            }
        ]
    },
    {
        "1": [
            {
                "home": "Leones de Playa",
                "away": "Panteras del Este"
            },
            {
                "home": "Tiburones Beach",
                "away": "Cóndores del Viento"
            }
        ],
        "2": [
            {
                "home": "Leones de Playa",
                "away": "Cóndores del Viento"
            },
            {
                "home": "Panteras del Este",
                "away": "Tiburones Beach"
            }
        ],
        "3": [
            {
                "home": "Leones de Playa",
                "away": "Tiburones Beach"
            },
            {
                "home": "Cóndores del Viento",
                "away": "Panteras del Este"
            }
        ]
    },
    {
        "1": [
            {
                "home": "Tigres del Mar",
                "away": "Jaguares del Sur"
            },
            {
                "home": "Delfines FC",
                "away": "Halcones del Norte"
            }
        ],
        "2": [
            {
                "home": "Tigres del Mar",
                "away": "Halcones del Norte"
            },
            {
                "home": "Jaguares del Sur",
                "away": "Delfines FC"
            }
        ],
        "3": [
            {
                "home": "Tigres del Mar",
                "away": "Delfines FC"
            },
            {
                "home": "Halcones del Norte",
                "away": "Jaguares del Sur"
            }
        ]
    }
];

const courtSchedules: CourtSchedule[] = [
    { court: 'Cancha #1', times: ['Mañana', 'Tarde'] },
    { court: 'Cancha #2', times: ['Mañana', 'Tarde'] }
];
const startTime = '07:00';
const intervalMinutes = 45;

console.log(matches);

const organizedMatches = distributor.reorganizeMatchesByRound(matches);

console.log(organizedMatches);

const assignedCourts = distributor.assignMatchesToCourts(organizedMatches, courtSchedules);

console.log(assignedCourts);
// Separar y mostrar los partidos por cancha
const scheduledMatches = distributor.assignTimesToMatches(assignedCourts, startTime, intervalMinutes);
const courts = [...new Set(assignedCourts.map(match => match.court))];

courts.forEach(court => {
    console.log(`\n${court}:`); 
    const matchesForCourt = scheduledMatches.filter(match => match.court === court);
    console.table(matchesForCourt.map(match => ({
    
        Horario: `${match.startTime}-${match.endTime}` ,
        Partido: `${match.home} vs ${match.away}`
    })));
});
