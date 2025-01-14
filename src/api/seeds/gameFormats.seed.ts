import { Logger } from "../config/logger/WinstonLogger";
import GameFormat from "../models/mongoose/championship/gameFormat";
import { DatabaseHelper } from "../utils/database.helper";

// src/api/seeds/gameFormats.seed.ts
const logger = new Logger();
export const gameFormats = [
    {
        name: 'elimination_simple',
        description: 'Eliminación directa hasta la final.',
        config: {
          levels: ['round_of_16', 'quarterfinals', 'semifinals', 'final'],
          groups: false,
          elimination: true,
          double_elimination: false,
        },
      },
      {
        name: 'elimination_double',
        description: 'Eliminación doble con un cuadro principal y de perdedores.',
        config: {
          levels: ['main_bracket', 'losers_bracket', 'final'],
          groups: false,
          elimination: true,
          double_elimination: true,
        },
      },
      {
        name: 'groups',
        description: 'Competencia basada en grupos de equipos.',
        config: {
          groups: true,
          elimination: false,
          group_size: 4,
          advancement: 2, // Equipos que avanzan por grupo
        },
      },
      {
        name: 'groups_and_elimination',
        description: 'Fase de grupos seguida de eliminación directa.',
        config: {
          groups: true,
          elimination: true,
          group_size: 4,
          advancement: 2, // Equipos que avanzan por grupo
          levels: ['quarterfinals', 'semifinals', 'final'],
        },
      },
      {
        name: 'league',
        description: 'Todos los equipos se enfrentan entre sí en una tabla única.',
        config: {
          groups: false,
          elimination: false,
          league: true,
        },
      },
      {
        name: 'swiss',
        description: 'Sistema de competencia suizo basado en rondas.',
        config: {
          groups: false,
          elimination: false,
          swiss: true,
          rounds: 5,
        },
      },
];

// Función para sembrar los datos
export const seedGameFormats = async (tenant: string) => {
    try {
        for (const format of gameFormats) {
            
            await DatabaseHelper.findOneAndUpdate(
                GameFormat,
                tenant,
                { name: format.name },
                format,
                { upsert: true, new: true }
            );
        }
        logger.info('Game formats seeded successfully');
    } catch (error) {
        logger.error('Error seeding game formats:', error);
    }
}