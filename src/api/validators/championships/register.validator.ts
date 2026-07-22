import { body, check, param } from "express-validator";
import { validate } from "../../middlewares";
const validPositions = [
    'BLOCKER',
    'DEFENDER',
    'SETTER',
    'OUTSIDE',
    'MIDDLE',
    'OPPOSITE',
    'LIBERO',
];

const validGenders = ['male', 'female'];

const validEps = [
    'sura',
    'nueva_eps',
    'sanitas',
    'compensar',
    'famisanar',
    'salud_total',
    'aliansalud',
    'coomeva',
    'medimas',
];

export const validateRegistration = [
    param('code')
        .isString()
        .isLength({ min: 10, max: 10 })
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage('Invalid invitation code format'),
    check('teamId').isMongoId().withMessage('INVALID_MONGO_ID'),
    body('payerData').isObject().withMessage('INVALID_PAYER_DATA').custom((value) => {
        if (!value.name) {
            throw new Error('INVALID_PAYER_NAME');
        }
        if (!value.surname) {
            throw new Error('INVALID_PAYER_SURNAME');
        }
        if (!value.email) {
            throw new Error('INVALID_PAYER_EMAIL');
        }
        if (!value.areaCode) {
            throw new Error('INVALID_PAYER_AREA_CODE');
        }
        if (!value.phoneNumber) {
            throw new Error('INVALID_PAYER_PHONE_NUMBER');
        }
        if (!value.address) {
            throw new Error('INVALID_PAYER_ADDRESS');
        }
        return true;
    }),
    validate,
];

export const validateRegisterTeamUsersAndPlayers = [
    param('code')
        .exists()
        .withMessage('Invitation code is required')
        .bail()
        .isString()
        .withMessage('Invitation code must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Invitation code cannot be empty'),

    body('team')
        .exists()
        .withMessage('Team data is required')
        .bail()
        .isObject()
        .withMessage('Team data must be an object'),

    body('team.name')
        .exists()
        .withMessage('Team name is required')
        .bail()
        .isString()
        .withMessage('Team name must be a string')
        .bail()
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('Team name must be between 2 and 80 characters'),

    body('team.logo')
        .optional()
        .isString()
        .withMessage('Team logo must be a string'),

    body('team.categoryId')
        .optional()
        .isString()
        .withMessage('Category id must be a string')
        .bail()
        .trim()
        .notEmpty()
        .withMessage('Category id cannot be empty'),

    body('team.captainEmail')
        .optional()
        .isEmail()
        .withMessage('Captain email must be valid')
        .bail()
        .normalizeEmail(),

    body('players')
        .exists()
        .withMessage('Players are required')
        .bail()
        .isArray({ min: 1 })
        .withMessage('Players must be an array with at least one player'),

    body('players.*.nie')
        .exists()
        .withMessage('Player NIE is required')
        .bail()
        .isString()
        .withMessage('Player NIE must be a string')
        .bail()
        .trim()
        .isLength({ min: 6, max: 20 })
        .withMessage('Player NIE must be between 6 and 20 characters'),
    body('players.*.name')
        .exists()
        .withMessage('Player name is required')
        .bail()
        .isString()
        .withMessage('Player name must be a string')
        .bail()
        .trim()
        .isLength({ min: 2, max: 80 })
        .withMessage('Player name must be between 2 and 80 characters'),

    body('players.*.lastName')
        .optional()
        .isString()
        .withMessage('Player lastName must be a string')
        .bail()
        .trim()
        .isLength({ max: 80 })
        .withMessage('Player lastName cannot exceed 80 characters'),

    body('players.*.email')
        .exists()
        .withMessage('Player email is required')
        .bail()
        .isEmail()
        .withMessage('Player email must be valid')
        .bail()
        .normalizeEmail(),

    body('players.*.phone')
        .optional()
        .isString()
        .withMessage('Player phone must be a string')
        .bail()
        .trim()
        .isLength({ min: 7, max: 20 })
        .withMessage('Player phone must be between 7 and 20 characters'),

    body('players.*.gender')
        .exists()
        .withMessage('Player gender is required')
        .bail()
        .isIn(validGenders)
        .withMessage('Player gender must be male or female'),

    body('players.*.dateOfBirth')
        .optional()
        .isISO8601()
        .withMessage('Player dateOfBirth must be a valid date'),

    body('players.*.position')
        .exists()
        .withMessage('Player position is required')
        .bail()
        .isIn(validPositions)
        .withMessage(`Player position must be one of: ${validPositions.join(', ')}`),

    body('players.*.eps')
        .exists()
        .withMessage('Player EPS is required')
        .bail()
        .isIn(validEps)
        .withMessage(`Player EPS must be one of: ${validEps.join(', ')}`),

    body('players.*.number')
        .optional()
        .isInt({ min: 1, max: 99 })
        .withMessage('Player number must be between 1 and 99'),

    body('players.*.clubId')
        .optional()
        .isMongoId()
        .withMessage('Player clubId must be a valid Mongo ID'),

    body('payerData')
        .exists()
        .withMessage('Payer data is required')
        .bail()
        .isObject()
        .withMessage('Payer data must be an object'),

    body('payerData.name')
        .exists()
        .withMessage('Payer name is required')
        .bail()
        .isString()
        .withMessage('Payer name must be a string')
        .bail()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Payer name must be between 2 and 100 characters'),

    body('payerData.email')
        .exists()
        .withMessage('Payer email is required')
        .bail()
        .isEmail()
        .withMessage('Payer email must be valid')
        .bail()
        .normalizeEmail(),

    body('payerData.phone')
        .optional()
        .isString()
        .withMessage('Payer phone must be a string')
        .bail()
        .trim()
        .isLength({ min: 7, max: 20 })
        .withMessage('Payer phone must be between 7 and 20 characters'),

    body('payerData.phoneNumber')
        .optional()
        .isString()
        .withMessage('Payer phoneNumber must be a string')
        .bail()
        .trim()
        .isLength({ min: 7, max: 20 })
        .withMessage('Payer phoneNumber must be between 7 and 20 characters'),

    body('payerData.areaCode')
        .optional()
        .isString()
        .withMessage('Payer areaCode must be a string')
        .bail()
        .trim()
        .isLength({ min: 1, max: 5 })
        .withMessage('Payer areaCode must be between 1 and 5 characters'),

    body('payerData.address')
        .optional()
        .isString()
        .withMessage('Payer address must be a string')
        .bail()
        .trim()
        .isLength({ max: 150 })
        .withMessage('Payer address cannot exceed 150 characters'),

    validate,
];