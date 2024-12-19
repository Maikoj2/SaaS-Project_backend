import { Logger } from '../api/config/logger';

interface TeamGroup {
    equipo: string;
    puesto: string;
    grupo: string;
}

interface GruposDistribuidos {
    [key: string]: TeamGroup[];
}

class GroupDistributor {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    generarEquipos(cantidad: number): string[] {
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

    distribuirEquipos(cantidadEquipos: number, cantidadGrupos: number): GruposDistribuidos {
        // Generar lista de equipos
        const equipos = this.generarEquipos(cantidadEquipos);
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
                ? Array.from({length: cantidadGrupos}, (_, i) => i)
                : Array.from({length: cantidadGrupos}, (_, i) => cantidadGrupos - 1 - i);

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

    testDistribucion(cantidadEquipos: number = 10, cantidadGrupos: number = 3) {
        const distribuidor = this.distribuirEquipos(cantidadEquipos, cantidadGrupos);
        
        Object.entries(distribuidor).forEach(([nombreGrupo, equipos]) => {
            console.log(`\n${nombreGrupo}:`);
            console.table(equipos, ['equipo', 'puesto', 'grupo']);
        });
        
        return distribuidor;
    }
}

// Ejemplos de uso:
const distributor = new GroupDistributor();

// Probar con diferentes cantidades
// console.log('\nPrueba con 6 equipos:');
// distributor.testDistribucion(6, 2);

// console.log('\nPrueba con 12 equipos:');
// distributor.testDistribucion(12, 3);

console.log('\nPrueba con 48 equipos:');
distributor.testDistribucion(48, 12); 