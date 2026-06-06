import { check, CustomValidator } from "express-validator";
import { MongooseHelper } from "../../utils/mongoose.helper";
import { validate } from "../../middlewares";

// Validador de fecha
const validateDate: CustomValidator = (value, { req }) => {
    const date = new Date(value);
    if (date < new Date()) {
        throw new Error('DATE_MUST_BE_FUTURE');
    }
    return true;
};

// Validador de fecha fin
const validateEndDate: CustomValidator = (value, { req }) => {
    const endDate = new Date(value);
    const startDate = new Date(req.body.startDate);
    if (endDate <= startDate) {
        throw new Error('END_DATE_MUST_BE_AFTER_START');
    }
    return true;
};

// Validador de IDs de MongoDB
const validateMongoIds: CustomValidator = async (value) => {
    if (!Array.isArray(value)) return true;

    for (const id of value) {
        if (!(await MongooseHelper.validateId(id))) {
            throw new Error('INVALID_ID_FORMAT');
        }
    }
    return true;
};

export const championshipValidators = {
    name: [
        check('name')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isLength({ min: 3, max: 100 })
            .withMessage('NAME_LENGTH_3_100')
            .trim(),
    ],

    description: [
        check('description')
            .optional()
            .isLength({ max: 500 })
            .withMessage('DESCRIPTION_MAX_500')
            .trim(),
    ],

    startDate: [
        check('startDate')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isISO8601()
            .withMessage('INVALID_DATE_FORMAT')
            .custom(validateDate),
    ],

    endDate: [
        check('endDate')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isISO8601()
            .withMessage('INVALID_DATE_FORMAT')
            .custom(validateEndDate),
    ],

    status: [
        check('status')
            .optional()
            .isIn(['draft', 'active', 'completed', 'cancelled'])
            .withMessage('INVALID_STATUS'),
    ],
    arrayFields: (field: 'phases' | 'teams' | 'courts' | 'matches' | 'registrations') => [
        check(field)
            .optional()
            .isArray()
            .withMessage('MUST_BE_ARRAY')
            .custom(validateMongoIds),
    ],
};

export const championshipConfigurationValidators = {
    maxTeams: [
        check('maxTeams')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isInt({ min: 2 })
            .withMessage('MUST_BE_GREATER_THAN_1'),
    ],
    gameFormat: [
        check('gameFormat')
            .optional()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),
    ],
    arrayFields: (field: 'setRatio' | 'pointRatio' | 'draw' | 'customRules') => [
        check(field)
            .optional()
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN')
            .isIn([true, false])
            .withMessage('INVALID_BOOLEAN_VALUE')

    ],
    matchDurationLimit: [
        check('matchDurationLimit')
            .optional()
            .isInt({ min: 1 })
            .withMessage('MUST_BE_GREATER_THAN_0'),
    ],
    setDurationLimit: [
        check('setDurationLimit')
            .optional()
            .isInt({ min: 1 })
            .withMessage('MUST_BE_GREATER_THAN_0'),
    ],
    registrationDeadline: [
        check('registrationDeadline')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isISO8601()
            .withMessage('INVALID_DATE_FORMAT')
            .custom(validateDate),
    ],
    registrationFee: [
        check('registrationFee')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isInt({ min: 0 })
            .withMessage('MUST_BE_GREATER_THAN_0'),
    ],
};

// Validadores compuestos para diferentes operaciones
export const validateCreateChampionship = [
    ...championshipValidators.name,
    ...championshipValidators.description,
    ...championshipValidators.startDate,
    ...championshipValidators.endDate,
    ...championshipValidators.status,
    ...championshipValidators.arrayFields('phases'),
    ...championshipValidators.arrayFields('teams'),
    ...championshipValidators.arrayFields('courts'),
    ...championshipValidators.arrayFields('matches'),
    ...championshipValidators.arrayFields('registrations'),
    validate,
];

export const validateUpdateChampionship = [
    check('name').optional(),
    ...championshipValidators.description,
    ...championshipValidators.startDate,
    ...championshipValidators.endDate,
    ...championshipValidators.status,
    ...championshipValidators.arrayFields('phases'),
    ...championshipValidators.arrayFields('teams'),
    ...championshipValidators.arrayFields('courts'),
    ...championshipValidators.arrayFields('matches'),
    ...championshipValidators.arrayFields('registrations'),
    validate,
];

export const validateCreateChampionshipConfiguration = [
    ...championshipConfigurationValidators.maxTeams,
    ...championshipConfigurationValidators.gameFormat,
    check('tieBreakerCriteria.setRatio')
        .optional()
        .isBoolean()
        .withMessage('MUST_BE_BOOLEAN'),
    check('tieBreakerCriteria.pointRatio')
        .optional()
        .isBoolean()
        .withMessage('MUST_BE_BOOLEAN'),
    check('tieBreakerCriteria.draw')
        .optional()
        .isBoolean()
        .withMessage('MUST_BE_BOOLEAN'),
    check('customRules')
        .optional()
        .isString()
        .withMessage('MUST_BE_STRING'),
    ...championshipConfigurationValidators.matchDurationLimit,
    ...championshipConfigurationValidators.setDurationLimit,
    ...championshipConfigurationValidators.registrationDeadline,
    ...championshipConfigurationValidators.registrationFee,
    validate,
];

