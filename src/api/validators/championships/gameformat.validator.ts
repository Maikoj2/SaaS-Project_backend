// src/api/validators/gameFormat.validator.ts
import { check } from 'express-validator';
import { validate } from '../../middlewares';

export const gameFormatValidators = {
    formatType: [
        check('formatType')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isIn(['single_set', 'best_of_2', 'best_of_3', 'custom'])
            .withMessage('INVALID_FORMAT_TYPE'),
    ],

    description: [
        check('description')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isLength({ max: 200 })
            .withMessage('DESCRIPTION_TOO_LONG'),
    ],

    sets: [
        check('sets')
            .exists()
            .withMessage('MISSING')
            .isInt({ min: 1, max: 5 })
            .withMessage('SETS_BETWEEN_1_AND_5'),
    ],

    pointsPerSet: [
        check('pointsPerSet')
            .exists()
            .withMessage('MISSING')
            .isInt({ min: 15, max: 30 })
            .withMessage('POINTS_BETWEEN_15_AND_30'),
    ],

    tiebreakerPoints: [
        check('tiebreakerPoints')
            .exists()
            .withMessage('MISSING')
            .isInt({ min: 1, max: 25 })
            .withMessage('TIEBREAKER_BETWEEN_1_AND_25'),
    ],

    maxPointsPerSet: [
        check('maxPointsPerSet')
            .exists()
            .withMessage('MISSING')
            .isInt({ min: 25, max: 40 })
            .withMessage('MAX_POINTS_BETWEEN_25_AND_40'),
    ],

    minAdvantage: [
        check('minAdvantage')
            .exists()
            .withMessage('MISSING')
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN'),
    ],
};

export const validateCreateGameFormat = [
    ...gameFormatValidators.formatType,
    ...gameFormatValidators.description,
    ...gameFormatValidators.sets,
    ...gameFormatValidators.pointsPerSet,
    ...gameFormatValidators.tiebreakerPoints,
    ...gameFormatValidators.maxPointsPerSet,
    ...gameFormatValidators.minAdvantage,
    validate,
];