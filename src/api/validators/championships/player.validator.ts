import { validate } from "../../middlewares";

import { check, query } from "express-validator";

import { validateField, paramsValidator, password } from '../expressValidatorHelper/checkFieldTovalidate';


import { EPSProvider, IndoorVolleyballPosition } from "../../models/mongoose/championship/player";
import { statusQueryValidator } from "../../utils/QueryParams.helper";

const allowedStatusPlayer = ['active', 'inactive', 'injured', 'suspended'];

export const playerValidation = {
    getPlayerById: [
        ...paramsValidator("id", true),
        validate,
    ],

    createPlayer: [
        ...paramsValidator("code", false),
        check('userId')
            .exists()
            .withMessage('MISSING')
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),
        check('eps')
            .exists()
            .withMessage('MISSING')
            .isIn(Object.values(EPSProvider))
            .withMessage('INVALID_EPS_PROVIDER'),
        check('gender')
            .exists()
            .withMessage('MISSING')
            .isIn(['male', 'female'])
            .withMessage('INVALID_GENDER'),

        check('position')
            .exists()
            .withMessage('MISSING'),


        check('number')
            .optional()
            .isInt({ min: 1, max: 99 })
            .withMessage('NUMBER_OUT_OF_RANGE'),

        check('status')
            .optional()
            .isIn(['active', 'inactive', 'injured', 'suspended'])
            .withMessage('INVALID_STATUS'),

        check('dateOfBirth')
            .optional()
            .isISO8601()
            .withMessage('INVALID_DATE'),

        check('height')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('weight')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('dominantHand')
            .optional()
            .isIn(['left', 'right'])
            .withMessage('INVALID_HAND'),

        ...validateField("nationality", false),

        check('isIndependent')
            .optional()
            .isBoolean()
            .withMessage('INVALID_BOOLEAN'),

        check('clubId')
            .optional()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT')
            .custom((clubId, { req }) => {
                if (req.body.isIndependent && clubId) {
                    throw new Error('INDEPENDENT_CLUB_CONFLICT');
                }
                return true;
            }),

        check('experience')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('photo')
            .optional()
            .isURL()
            .withMessage('INVALID_URL'),

        validate,
    ] as any[],

    createPlayerManually: [
        ...paramsValidator("championshipId", true),
        check('sendEmail')
            .optional()
            .isBoolean()
            .withMessage('INVALID_BOOLEAN'),
        check('user.name')
            .exists()
            .withMessage('MISSING')
            .isString()
            .withMessage('INVALID_STRING')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('INVALID_LENGTH'),
        check('user.lastName')
            .exists()
            .withMessage('MISSING')
            .isString()
            .withMessage('INVALID_STRING')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('INVALID_LENGTH'),
        check('user.email')
            .exists()
            .withMessage('MISSING')
            .isEmail()
            .withMessage('INVALID_EMAIL'),
        // ...password('user.password', false),
        check('user.phone')
            .optional()
            .isString()
            .withMessage('INVALID_PHONE'),
        check('user.nie')
            .optional()
            .isString()
            .withMessage('INVALID_NIE'),

        check('player.eps')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isIn(Object.values(EPSProvider))
            .withMessage('INVALID_EPS_PROVIDER'),

        check('player.gender')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isIn(['male', 'female'])
            .withMessage('INVALID_GENDER'),

        check('player.position')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isString()
            .withMessage('INVALID_POSITION'),

        check('player.dateOfBirth')
            .optional()
            .isISO8601()
            .withMessage('INVALID_DATE'),

        check('player.number')
            .optional()
            .isInt({ min: 1, max: 99 })
            .withMessage('NUMBER_OUT_OF_RANGE'),
        check('isIndependent')
            .optional()
            .isBoolean()
            .withMessage('INVALID_BOOLEAN'),
        check('clubId')
            .optional()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT')
            .custom((clubId, { req }) => {
                if (req.body.isIndependent && clubId) {
                    throw new Error('INDEPENDENT_CLUB_CONFLICT');
                }
                return true;
            }),
        check('experience')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),
        check('photo')
            .optional()
            .isURL()
            .withMessage('INVALID_URL'),
        validate,
    ] as any[],

    updatePlayer: [
        ...paramsValidator("id", true),
        ...validateField("name", false),
        check('gender')
            .optional()
            .isIn(['male', 'female'])
            .withMessage('INVALID_GENDER'),
        check('position')
            .optional()
        ,
        check('number')
            .optional()
            .isInt({ min: 1, max: 99 })
            .withMessage('NUMBER_OUT_OF_RANGE'),

        check('status')
            .optional()
            .isIn(['active', 'inactive', 'injured', 'suspended'])
            .withMessage('INVALID_STATUS'),

        check('dateOfBirth')
            .optional()
            .isISO8601()
            .withMessage('INVALID_DATE'),

        check('height')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('weight')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('dominantHand')
            .optional()
            .isIn(['left', 'right'])
            .withMessage('INVALID_HAND'),

        ...validateField("nationality", false),

        check('isIndependent')
            .optional()
            .isBoolean()
            .withMessage('INVALID_BOOLEAN'),

        check('clubId')
            .optional()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT')
            .custom((clubId, { req }) => {
                if (req.body.isIndependent && clubId) {
                    throw new Error('INDEPENDENT_CLUB_CONFLICT');
                }
                return true;
            }),

        check('experience')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('photo')
            .optional()
            .isURL()
            .withMessage('INVALID_URL'),

        check('teamId')
            .optional()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),

        validate,
    ],

    getPlayers: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('INVALID_PAGE'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('INVALID_LIMIT'),

        query('sort')
            .optional()
            .isIn(['name', 'number', 'position', 'status', 'createdAt'])
            .withMessage('INVALID_SORT'),

        query('order')
            .optional()
            .isIn(['1', '-1'])
            .withMessage('INVALID_ORDER'),

        validate
    ],

    deletePlayer: [
        ...paramsValidator("id", true),
        validate,
    ],
    getPlayersByChampionship: [

        ...paramsValidator("championshipId", true),
        statusQueryValidator('status', allowedStatusPlayer),

        query('gender')
            .optional()
            .isIn(['male', 'female'])
            .withMessage('INVALID_GENDER'),

        query('search')
            .optional()
            .isString()
            .withMessage('INVALID_SEARCH')
            .bail()
            .trim()
            .isLength({ min: 2, max: 80 })
            .withMessage('INVALID_SEARCH_LENGTH'),

        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('INVALID_PAGE'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('INVALID_LIMIT'),

        validate,
    ],

    getPlayerByChampionship: [

        ...paramsValidator("championshipId", true),


        ...paramsValidator("playerId", true),

        validate,
    ],

    updatePlayerByChampionship: [
        ...paramsValidator("championshipId", true),
        ...paramsValidator("playerId", true),
        check('eps')
            .optional()
            .isIn(Object.values(EPSProvider))
            .withMessage('INVALID_EPS_PROVIDER'),

        check('gender')
            .optional()
            .isIn(['male', 'female'])
            .withMessage('INVALID_GENDER'),

        check('position')
            .optional(),

        check('number')
            .optional()
            .isInt({ min: 1, max: 99 })
            .withMessage('NUMBER_OUT_OF_RANGE'),

        statusQueryValidator('status', allowedStatusPlayer),

        check('dateOfBirth')
            .optional()
            .isISO8601()
            .withMessage('INVALID_DATE'),

        check('height')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('weight')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('dominantHand')
            .optional()
            .isIn(['left', 'right'])
            .withMessage('INVALID_HAND'),

        ...validateField("nationality", false),

        check('experience')
            .optional()
            .isNumeric()
            .withMessage('INVALID_NUMBER'),

        check('photo')
            .optional()
            .isURL()
            .withMessage('INVALID_URL'),

        validate,
    ],
};