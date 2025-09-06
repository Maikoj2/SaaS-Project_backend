import { Logger } from "../config";
import Court from "../models/mongoose/championship/court";
import MatchFormat from "../models/mongoose/championship/matchformat";
import { DatabaseHelper } from "../utils/database.helper";

const logger = new Logger();

const matchFormatSeeds = [
    {
        formatType: 'single_set',
        description: 'Un solo set por partido.',
        isCustom: false,
        config: {
            sets: 1,
            pointsPerSet: 25,
            tiebreakerPoints: 15,
            maxPointsPerSet: 30,
            minAdvantage: true,
            customRules: null
        }
    },
    {
        formatType: 'best_of_3',
        description: 'Mejor de 3 sets.',
        isCustom: false,
        config: {
            sets: 3,
            pointsPerSet: 25,
            tiebreakerPoints: 15,
            maxPointsPerSet: 30,
            minAdvantage: true,
            customRules: null
        }
    },
    {
        formatType: 'best_of_5',
        description: 'Mejor de 5 sets (usualmente para finales).',
        isCustom: false,
        config: {
            sets: 5,
            pointsPerSet: 25,
            tiebreakerPoints: 15,
            maxPointsPerSet: 30,
            minAdvantage: true,
            customRules: null
        }
    },
    {
        formatType: 'best_of_2',
        description: 'Dos sets garantizados.',
        isCustom: false,
        config: {
            sets: 2,
            pointsPerSet: 21,
            tiebreakerPoints: 15,
            maxPointsPerSet: 25,
            minAdvantage: true,
            customRules: null
        }
    },
    {
        formatType: 'tiebreaker_only',
        description: 'Solo partidos de desempate (un set corto).',
        isCustom: false,
        config: {
            sets: 1,
            pointsPerSet: 15,
            tiebreakerPoints: null,
            maxPointsPerSet: 20,
            minAdvantage: true,
            customRules: null
        }
    },
    {
        formatType: 'fast_match',
        description: 'Partidos rápidos con sets más cortos.',
        isCustom: false,
        config: {
            sets: 3,
            pointsPerSet: 15,
            tiebreakerPoints: 10,
            maxPointsPerSet: 20,
            minAdvantage: false,
            customRules: null
        }
    },
    {
        formatType: 'custom',
        description: 'Formato personalizado para torneos especiales.',
        isCustom: true,
        config: {
            sets: null,
            pointsPerSet: null,
            tiebreakerPoints: null,
            maxPointsPerSet: null,
            minAdvantage: null,
            customRules: 'Reglas específicas del torneo definidas por el organizador.'
        }
    }
];



export const seedMatchFormats = async (tenant: string) => {
    try {
        for (const matchFormat of matchFormatSeeds) {
            await DatabaseHelper.findOneAndUpdate(
                MatchFormat,
                tenant,
                { formatType: matchFormat.formatType },
                matchFormat,
                { upsert: true, new: true }
            );
        }
        logger.info('Match formats seeded successfully');
    } catch (error) {
        logger.error('Error seeding match formats:', error);
    }
};