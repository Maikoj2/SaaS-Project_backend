import { check, CustomValidator } from "express-validator";
import { MongooseHelper } from "../../utils/mongoose.helper";
import { validate } from "../../middlewares";
import { ChampionshipStatus } from "../../constants/championship.constants";
import { ChampionshipService } from "../../services/championship/championship.service";
import {
    validateDate,
    validateEndDate,
    validateRegistrationDeadlineBeforeStart
} from "../../utils/dateValidator";
import { CompetitionRulePreset } from "../../domain/championship/rules/competitionRules.presets";
import { paramsValidator } from "../expressValidatorHelper";
import { EXECUTABLE_DISTRIBUTION_STRATEGIES } from "../../domain/championship/competition";
import {
    validateMatchRulesSetRelationship,
    validatePresetMatchRulesCompatibility
} from "./matchRules.validator";
import { validateEliminationSettingsRelationships } from "./eliminationSettings.validator";





// Validador de IDs de MongoDB
export const validateMongoIds: CustomValidator = async (value) => {
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
            .isIn(ChampionshipStatus)
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
        check('gameFormatId')
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
            .custom(validateDate)
            .custom(validateRegistrationDeadlineBeforeStart),
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
export const validateCreateChampionship: any[] = [
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

export const validateUpdateChampionship: any[] = [
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

export const validateCreateChampionshipConfiguration: any[] = [
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
    check('matchRules').custom(validateMatchRulesSetRelationship),
    check('matchRules')
        .optional()
        .custom(validatePresetMatchRulesCompatibility),
    check('distributionStrategy')
        .optional()
        .trim()
        .isIn(EXECUTABLE_DISTRIBUTION_STRATEGIES)
        .withMessage('INVALID_DISTRIBUTION_STRATEGY'),
    check('tablePointsPolicy')
        .optional()
        .isObject()
        .withMessage('MUST_BE_OBJECT'),
    ...['winPoints', 'lossPoints', 'walkoverWinPoints', 'walkoverLossPoints'].map(
        field => check(`tablePointsPolicy.${field}`)
            .optional()
            .isFloat({ min: 0 })
            .withMessage('MUST_BE_NUMBER_GREATER_THAN_OR_EQUAL_TO_0')
    ),
    check('tablePointsPolicy').custom(value => {
        if (!value) return true;
        if (
            value.winPoints !== undefined &&
            value.lossPoints !== undefined &&
            Number(value.winPoints) < Number(value.lossPoints)
        ) {
            throw new Error('WIN_POINTS_MUST_BE_GREATER_THAN_OR_EQUAL_TO_LOSS_POINTS');
        }
        if (
            value.walkoverWinPoints !== undefined &&
            value.walkoverLossPoints !== undefined &&
            Number(value.walkoverWinPoints) < Number(value.walkoverLossPoints)
        ) {
            throw new Error('WALKOVER_WIN_POINTS_MUST_BE_GREATER_THAN_OR_EQUAL_TO_WALKOVER_LOSS_POINTS');
        }
        return true;
    }),
    check('eliminationSettings')
        .optional()
        .isObject()
        .withMessage('MUST_BE_OBJECT'),
    check('eliminationSettings.enabled').optional().isBoolean().withMessage('MUST_BE_BOOLEAN'),
    check('eliminationSettings.qualificationMode')
        .optional()
        .isIn(['topPerGroup', 'topPerGroupPlusBestThirds'])
        .withMessage('INVALID_QUALIFICATION_MODE'),
    check('eliminationSettings.bracketSeedingStrategy')
        .optional()
        .isIn(['overallRanking', 'groupCross', 'random'])
        .withMessage('INVALID_BRACKET_SEEDING_STRATEGY'),
    check('eliminationSettings.topPerGroup').optional().isInt({ min: 1 }).withMessage('MUST_BE_GREATER_THAN_0'),
    check('eliminationSettings.bestThirdsCount').optional().isInt({ min: 0 }).withMessage('MUST_BE_GREATER_THAN_OR_EQUAL_TO_0'),
    check('eliminationSettings.totalQualifiers').optional().isInt({ min: 2 }).withMessage('MUST_BE_GREATER_THAN_1'),
    check('eliminationSettings.bracketSize').optional().isIn([4, 8, 16, 32]).withMessage('INVALID_BRACKET_SIZE'),
    check('eliminationSettings.initialMatchNumber').optional().isInt({ min: 1 }).withMessage('MUST_BE_GREATER_THAN_0'),
    check('eliminationSettings.normalizeStandingsForUnevenGroups').optional().isBoolean().withMessage('MUST_BE_BOOLEAN'),
    check('eliminationSettings.includeThirdPlaceMatch').optional().isBoolean().withMessage('MUST_BE_BOOLEAN'),
    check('eliminationSettings.autoGenerateAfterGroupStage').optional().isBoolean().withMessage('MUST_BE_BOOLEAN'),
    check('eliminationSettings').custom(value => {
        if (!value?.enabled) return true;
        const totalQualifiers = Number(value.totalQualifiers);
        const bracketSize = Number(value.bracketSize);
        if (bracketSize < totalQualifiers) {
            throw new Error('BRACKET_SIZE_MUST_BE_GREATER_THAN_OR_EQUAL_TO_TOTAL_QUALIFIERS');
        }
        if (
            value.qualificationMode === 'topPerGroupPlusBestThirds' &&
            Number(value.bestThirdsCount) <= 0
        ) {
            throw new Error('BEST_THIRDS_COUNT_MUST_BE_GREATER_THAN_0');
        }
        return true;
    }),
    check('eliminationSettings')
        .optional()
        .custom(validateEliminationSettingsRelationships),
    check('competitionRulePreset')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isIn(Object.values(CompetitionRulePreset))
        .withMessage('INVALID_COMPETITION_RULE_PRESET'),
    ...championshipConfigurationValidators.matchDurationLimit,
    ...championshipConfigurationValidators.setDurationLimit,
    ...championshipConfigurationValidators.registrationDeadline,
    ...championshipConfigurationValidators.registrationFee,

    validate,
];


export const validateUpdateChampionshipStatus: any[] = [
    check('status')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isIn(ChampionshipStatus)
        .withMessage('INVALID_STATUS'),
    check('id')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isMongoId()
        .withMessage('INVALID_ID_FORMAT'),
    validate,
];

export const validateUpdateChampionshipBasicInfo: any[] = [
    ...paramsValidator('championshipId', true),
    check('name')
        .optional()
        .isString()
        .withMessage('MUST_BE_STRING')
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('NAME_LENGTH_3_100'),
    check('description')
        .optional()
        .isString()
        .withMessage('MUST_BE_STRING')
        .isLength({ max: 500 })
        .withMessage('DESCRIPTION_MAX_500'),
    check('startDate')
        .optional()
        .isISO8601()
        .withMessage('INVALID_DATE_FORMAT')
        .toDate(),
    check('endDate')
        .optional()
        .isISO8601()
        .withMessage('INVALID_DATE_FORMAT')
        .toDate(),
    validate,
];

export const validateSoftDeleteChampionship: any[] = [
    check('championshipId')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isMongoId()
        .withMessage('INVALID_ID_FORMAT'),
    check('deleteReason')
        .exists()
        .withMessage('MISSING')
        .bail()
        .isString()
        .withMessage('MUST_BE_STRING')
        .bail()
        .trim()
        .isLength({ min: 3, max: 500 })
        .withMessage('DELETE_REASON_LENGTH_3_500'),
    validate,
];

export const validateRegisterTeam: any[] = [
    check('championshipId')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isMongoId()
        .withMessage('INVALID_ID_FORMAT')
        .custom(async (value, { req }) => {
            const championshipService = new ChampionshipService();
            const tenant = req.clientAccount as string;
            const championship = await championshipService.findById(value, tenant);
            if (!championship) {
                throw new Error('CHAMPIONSHIP_NOT_FOUND');
            }
            return true;
        }),
    check('teamId')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isMongoId()
        .withMessage('INVALID_ID_FORMAT'),
    // .custom(async (value, { req }) => {
    //     const teamService = new TeamService();
    //     const team = await teamService.findById(req.tenant, value);
    //     if (!team) {
    //         throw new Error('TEAM_NOT_FOUND');
    //     }
    //     return true;
    // }),//TODO: implement team validation
    validate,
];

export const validateChampionShip = {
    getChampionById: [
        ...paramsValidator('championshipId', true),
    ]
}
