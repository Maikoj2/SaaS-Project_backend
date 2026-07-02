import { Logger } from "../config";
import GameFormat from "../models/mongoose/championship/gameFormat";
import { DatabaseHelper } from "../utils/database.helper";

const logger = new Logger();

// Formatos de juego reales compatibles con tu esquema de Mongoose
export const gameFormats = [
    {
        formatType: 'single_set',
        description: 'Un único set a 21 puntos (Ventaja de 2 puntos desactivada)',
        sets: 1,
        pointsPerSet: 21,
        minAdvantage: false,
    },
    {
        formatType: 'best_of_3',
        description: 'Al mejor de 3 sets a 21 puntos con ventaja de 2 puntos',
        sets: 3,
        pointsPerSet: 21,
        minAdvantage: true,
        tiebreakerPoints: 15, // Set de desempate (tercer set) a 15 puntos
    },
    {
        formatType: 'best_of_2',
        description: 'Al mejor de 2 sets a 21 puntos (empate posible)',
        sets: 2,
        pointsPerSet: 21,
        minAdvantage: false,
    }
];

// Función para sembrar los datos
export const seedGameFormats = async (tenant: string) => {
    try {
        for (const format of gameFormats) {
            // Buscamos y actualizamos usando el campo del esquema "formatType"
            await DatabaseHelper.findOneAndUpdate(
                GameFormat,
                tenant,
                { formatType: format.formatType },
                format,
                { upsert: true, new: true }
            );
        }
        logger.info('Game formats seeded successfully');
    } catch (error) {
        logger.error('Error seeding game formats:', error);
    }
}