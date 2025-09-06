import { check } from "express-validator";
import { validate } from "../../middlewares";
import { paramsValidator, validateField } from "../expressValidatorHelper";
import { validateMongoIds } from "./campionship.validator";

export const championshipConfigurationValidators = {

    updateChampionshipConfiguration: [
        ...paramsValidator("idConfiguration", true),
        ...validateField("maxTeams", false),
        check("maxTeams")
            .optional()
            .isInt({ min: 4, max: 48 })
            .withMessage('MAX_TEAMS_MUST_BE_INTEGER_BETWEEN_4_AND_48'),
        check("courts")
            .optional()
            .isArray()
            .withMessage('MUST_BE_ARRAY')
            .custom(validateMongoIds),
        ...validateField("competitionType", false),
        check("competitionType")
            .optional()
            .isIn(['elimination', 'double-elimination', 'group-classification', 'round-robin', 'custom'])
            .withMessage('INVALID_COMPETITION_TYPE'),
        ...validateField("gameFormatId", false),
        ...validateField("tieBreakerCriteria", false),
        ...validateField("tournamentBracket", false),
        check("customRules")
            .optional()
            .isString()
            .isLength({ max: 500 })
            .withMessage('CUSTOM_RULES_TOO_LONG'),
        check("matchDurationLimit")
            .optional()
            .isInt({ min: 0 })
            .withMessage('MATCH_DURATION_LIMIT_MUST_BE_NON_NEGATIVE_INTEGER'),
        check("setDurationLimit")
            .optional()
            .isInt({ min: 0 })
            .withMessage('SET_DURATION_LIMIT_MUST_BE_NON_NEGATIVE_INTEGER'),
        check("registrationDeadline")
            .optional()
            .isISO8601()
            .withMessage('INVALID_DATE_FORMAT')
            .custom((value) => new Date(value) > new Date())
            .withMessage('REGISTRATION_DEADLINE_MUST_BE_IN_FUTURE'),
        check("registrationFee")
            .optional()
            .isInt({ min: 0 })
            .withMessage('REGISTRATION_FEE_MUST_BE_NON_NEGATIVE_INTEGER'),
        // ... otras validaciones si es necesario ...
        validate
    ],

    getChampionshipConfiguration: [
        ...paramsValidator("idConfiguration", true),
        validate
    ]
}