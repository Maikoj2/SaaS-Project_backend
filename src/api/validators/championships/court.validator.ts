import { body, query } from 'express-validator';
import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';
import { statusQueryValidator } from '../../utils/QueryParams.helper';

const allowedCourtTypes = ['indoor', 'beach'];

const allowedCourtStatuses = [
    'available',
    'reserved',
    'occupied',
    'maintenance',
];

export const validateCourt = {
    createCourt: [
        body('name')
            .notEmpty()
            .withMessage('Court name is required')
            .isString()
            .withMessage('Court name must be a string'),

        body('type')
            .notEmpty()
            .withMessage('Court type is required')
            .isIn(allowedCourtTypes)
            .withMessage('Invalid court type'),

        body('status')
            .optional()
            .isIn(allowedCourtStatuses)
            .withMessage('Invalid court status'),

        body('capacity')
            .notEmpty()
            .withMessage('Court capacity is required')
            .isNumeric()
            .withMessage('Court capacity must be a number')
            .custom((value) => Number(value) > 0)
            .withMessage('Court capacity must be greater than zero'),

        body('location')
            .optional()
            .isString()
            .withMessage('Location must be a string'),

        body('dimensions')
            .optional()
            .isString()
            .withMessage('Dimensions must be a string'),

        body('surface')
            .optional()
            .isString()
            .withMessage('Surface must be a string'),

        body('amenities')
            .optional()
            .isArray()
            .withMessage('Amenities must be an array'),

        body('amenities.*')
            .optional()
            .isString()
            .withMessage('Each amenity must be a string'),

        validate,
    ],

    getCourts: [
        statusQueryValidator('status', allowedCourtStatuses),

        query('type')
            .optional()
            .isIn(allowedCourtTypes)
            .withMessage('Invalid court type'),

        query('currentChampionshipId')
            .optional()
            .isMongoId()
            .withMessage('Invalid currentChampionshipId'),

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

    getAvailableCourts: [
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

    getCourtById: [
        ...paramsValidator('courtId', true),
        validate,
    ],

    updateCourt: [
        ...paramsValidator('courtId', true),

        body('name')
            .optional()
            .isString()
            .withMessage('Court name must be a string'),

        body('type')
            .optional()
            .isIn(allowedCourtTypes)
            .withMessage('Invalid court type'),

        body('status')
            .optional()
            .isIn(allowedCourtStatuses)
            .withMessage('Invalid court status'),

        body('capacity')
            .optional()
            .isNumeric()
            .withMessage('Court capacity must be a number')
            .custom((value) => Number(value) > 0)
            .withMessage('Court capacity must be greater than zero'),

        body('location')
            .optional()
            .isString()
            .withMessage('Location must be a string'),

        body('dimensions')
            .optional()
            .isString()
            .withMessage('Dimensions must be a string'),

        body('surface')
            .optional()
            .isString()
            .withMessage('Surface must be a string'),

        body('amenities')
            .optional()
            .isArray()
            .withMessage('Amenities must be an array'),

        body('amenities.*')
            .optional()
            .isString()
            .withMessage('Each amenity must be a string'),

        validate,
    ],

    deleteCourt: [
        ...paramsValidator('courtId', true),
        validate,
    ],

    attachCourtsToChampionship: [
        ...paramsValidator('championshipId', true),

        body('courtIds')
            .isArray({ min: 1 })
            .withMessage('courtIds must be a non-empty array'),

        body('courtIds.*')
            .isMongoId()
            .withMessage('Each courtId must be valid'),

        validate,
    ],

    detachCourtsFromChampionship: [
        ...paramsValidator('championshipId', true),

        body('courtIds')
            .isArray({ min: 1 })
            .withMessage('courtIds must be a non-empty array'),

        body('courtIds.*')
            .isMongoId()
            .withMessage('Each courtId must be valid'),

        validate,
    ],

    markCourtAsOccupied: [
        ...paramsValidator('courtId', true),
        validate,
    ],

    markCourtAsReserved: [
        ...paramsValidator('courtId', true),
        validate,
    ],
};