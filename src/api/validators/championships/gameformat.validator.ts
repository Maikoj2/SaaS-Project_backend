import { body, query } from 'express-validator';
import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';

const allowedFormatTypes = [
    'single_set',
    'best_of_3',
    'best_of_2',
    'custom',
];

export const validateGameFormat = {
    createGameFormat: [
        body('formatType')
            .notEmpty()
            .withMessage('formatType is required')
            .isIn(allowedFormatTypes)
            .withMessage('Invalid formatType'),

        body('description')
            .optional()
            .isString()
            .withMessage('description must be a string'),

        body('sets')
            .notEmpty()
            .withMessage('sets is required')
            .isInt({ min: 1 })
            .withMessage('sets must be greater than zero'),

        body('pointsPerSet')
            .notEmpty()
            .withMessage('pointsPerSet is required')
            .isInt({ min: 1 })
            .withMessage('pointsPerSet must be greater than zero'),

        body('tiebreakerPoints')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('tiebreakerPoints must be greater than zero'),

        body('maxPointsPerSet')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('maxPointsPerSet must be greater than zero'),

        body('minAdvantage')
            .notEmpty()
            .withMessage('minAdvantage is required')
            .isInt({ min: 1 })
            .withMessage('minAdvantage must be greater than zero'),

        body('customRules')
            .optional()
            .isString()
            .withMessage('customRules must be a string'),

        body('formatType').custom((formatType, { req }) => {
            const sets = Number(req.body.sets);

            if (formatType === 'single_set' && sets !== 1) {
                throw new Error('single_set format must have exactly 1 set');
            }

            if (formatType === 'best_of_3' && sets !== 3) {
                throw new Error('best_of_3 format must have exactly 3 sets');
            }

            if (formatType === 'best_of_2' && sets !== 2) {
                throw new Error('best_of_2 format must have exactly 2 sets');
            }

            return true;
        }),

        body('maxPointsPerSet').custom((maxPointsPerSet, { req }) => {
            if (
                maxPointsPerSet !== undefined &&
                maxPointsPerSet !== null &&
                Number(maxPointsPerSet) < Number(req.body.pointsPerSet)
            ) {
                throw new Error(
                    'maxPointsPerSet cannot be lower than pointsPerSet'
                );
            }

            return true;
        }),

        validate,
    ],

    getGameFormats: [
        query('formatType')
            .optional()
            .isIn(allowedFormatTypes)
            .withMessage('Invalid formatType'),

        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be greater than zero'),

        query('limit')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Limit must be greater than zero'),

        validate,
    ],

    getGameFormatById: [
        ...paramsValidator('gameFormatId', true),
        validate,
    ],

    updateGameFormat: [
        ...paramsValidator('gameFormatId', true),

        body('description')
            .optional()
            .isString()
            .withMessage('description must be a string'),

        body('sets')
            .optional()
            .isInt({ min: 1 })
            .withMessage('sets must be greater than zero'),

        body('pointsPerSet')
            .optional()
            .isInt({ min: 1 })
            .withMessage('pointsPerSet must be greater than zero'),

        body('tiebreakerPoints')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('tiebreakerPoints must be greater than zero'),

        body('maxPointsPerSet')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('maxPointsPerSet must be greater than zero'),

        body('minAdvantage')
            .optional()
            .isInt({ min: 1 })
            .withMessage('minAdvantage must be greater than zero'),

        body('customRules')
            .optional()
            .isString()
            .withMessage('customRules must be a string'),

        body('maxPointsPerSet').custom((maxPointsPerSet, { req }) => {
            if (
                maxPointsPerSet !== undefined &&
                maxPointsPerSet !== null &&
                req.body.pointsPerSet !== undefined &&
                Number(maxPointsPerSet) < Number(req.body.pointsPerSet)
            ) {
                throw new Error(
                    'maxPointsPerSet cannot be lower than pointsPerSet'
                );
            }

            return true;
        }),

        validate,
    ],

    deleteGameFormat: [
        ...paramsValidator('gameFormatId', true),
        validate,
    ],

    assignGameFormatToChampionshipConfiguration: [
        ...paramsValidator('championshipId', true),

        body('gameFormatId')
            .notEmpty()
            .withMessage('gameFormatId is required')
            .isMongoId()
            .withMessage('Invalid gameFormatId'),

        validate,
    ],
};