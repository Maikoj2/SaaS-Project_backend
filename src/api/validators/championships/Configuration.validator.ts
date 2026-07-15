import { check } from "express-validator";
import { validate } from "../../middlewares";
import { paramsValidator, validateField } from "../expressValidatorHelper";
import { validateMongoIds } from "./championship.validator";

const distributionStrategies = ['serpentine', 'linear', 'random', 'balancedByClub'];
const volleyballTypes = ['beach', 'indoor'];


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
        check("gameFormatId")
            .optional()
            .isMongoId()
            .withMessage('INVALID_GAME_FORMAT_ID'),
        check("distributionStrategy")
            .optional()
            .isIn(distributionStrategies)
            .withMessage('INVALID_DISTRIBUTION_STRATEGY'),
        check("tieBreakerCriteria")
            .optional()
            .isObject()
            .withMessage('TIE_BREAKER_CRITERIA_MUST_BE_OBJECT'),
        check("tieBreakerCriteria.setRatio")
            .optional()
            .isBoolean()
            .withMessage('SET_RATIO_MUST_BE_BOOLEAN')
            .toBoolean(),
        check("tieBreakerCriteria.pointRatio")
            .optional()
            .isBoolean()
            .withMessage('POINT_RATIO_MUST_BE_BOOLEAN')
            .toBoolean(),
        check("tieBreakerCriteria.draw")
            .optional()
            .isBoolean()
            .withMessage('DRAW_MUST_BE_BOOLEAN')
            .toBoolean(),
        check("matchRules")
            .optional()
            .isObject()
            .withMessage('MATCH_RULES_MUST_BE_OBJECT'),
        check("matchRules.volleyballType")
            .optional()
            .isIn(volleyballTypes)
            .withMessage('INVALID_VOLLEYBALL_TYPE'),
        check("matchRules.setsToWin")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('SETS_TO_WIN_MUST_BE_INTEGER')
            .toInt(),
        check("matchRules.maxSets")
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('MAX_SETS_MUST_BE_INTEGER')
            .toInt(),
        check("matchRules.regularSetPoints")
            .optional()
            .isInt({ min: 1 })
            .withMessage('REGULAR_SET_POINTS_MUST_BE_INTEGER')
            .toInt(),
        check("matchRules.tieBreakPoints")
            .optional()
            .isInt({ min: 1 })
            .withMessage('TIE_BREAK_POINTS_MUST_BE_INTEGER')
            .toInt(),
        check("matchRules.minimumPointDifference")
            .optional()
            .isInt({ min: 1 })
            .withMessage('MINIMUM_POINT_DIFFERENCE_MUST_BE_INTEGER')
            .toInt(),
        check("tablePointsPolicy")
            .optional()
            .isObject()
            .withMessage('TABLE_POINTS_POLICY_MUST_BE_OBJECT'),
        check("tablePointsPolicy.winPoints")
            .optional()
            .isInt({ min: 0 })
            .withMessage('WIN_POINTS_MUST_BE_NON_NEGATIVE_INTEGER')
            .toInt(),
        check("tablePointsPolicy.lossPoints")
            .optional()
            .isInt({ min: 0 })
            .withMessage('LOSS_POINTS_MUST_BE_NON_NEGATIVE_INTEGER')
            .toInt(),
        check("tablePointsPolicy.walkoverLossPoints")
            .optional()
            .isInt({ min: 0 })
            .withMessage('WALKOVER_LOSS_POINTS_MUST_BE_NON_NEGATIVE_INTEGER')
            .toInt(),
        check("tablePointsPolicy.walkoverWinPoints")
            .optional()
            .isInt({ min: 0 })
            .withMessage('WALKOVER_WIN_POINTS_MUST_BE_NON_NEGATIVE_INTEGER')
            .toInt(),
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
