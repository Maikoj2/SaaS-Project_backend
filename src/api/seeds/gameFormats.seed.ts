import GameFormat from "../models/mongoose/championschip/gameFormat";

// src/api/seeds/gameFormats.seed.ts
export const gameFormats = [
    {
        formatType: 'single_set',
        description: 'Un solo set por partido',
        sets: 1,
        pointsPerSet: 25,
        tiebreakerPoints: 15,
        maxPointsPerSet: 30,
        minAdvantage: true
    },
    {
        formatType: 'best_of_3',
        description: 'Mejor de 3 sets',
        sets: 3,
        pointsPerSet: 25,
        tiebreakerPoints: 15,
        maxPointsPerSet: 30,
        minAdvantage: true
    },
    {
        formatType: 'best_of_2',
        description: 'Dos sets garantizados',
        sets: 2,
        pointsPerSet: 25,
        tiebreakerPoints: 15,
        maxPointsPerSet: 30,
        minAdvantage: true
    },
    {
        formatType: 'custom',
        description: 'Formato personalizado para torneos especiales',
        sets: 5,
        pointsPerSet: 21,
        tiebreakerPoints: 15,
        maxPointsPerSet: 25,
        minAdvantage: true,
        customRules: 'Reglas específicas del torneo'
    }
];

// Función para sembrar los datos
