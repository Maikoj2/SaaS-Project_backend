import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';
import { statusQueryValidator } from '../../utils/QueryParams.helper';
import { check } from 'express-validator';

const allowedStatuses = ['active', 'draft', 'finalized',];
function isTodayOrFutureDateInBogota(value: string): boolean {
    const todayInBogota = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bogota',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

    return value >= todayInBogota;
}


export const validateGroupDistribution = {
    createGroupDistribution: [
        ...paramsValidator('championshipId', true),

        check('schedule.enabled')
            .optional()
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN'),

        check('schedule.date')
            .if(check('schedule.enabled').equals('true'))
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isISO8601()
            .withMessage('MUST_BE_VALID_DATE')
            .custom((value) => {
                if (!isTodayOrFutureDateInBogota(value)) {
                    throw new Error('DATE_MUST_BE_TODAY_OR_FUTURE');
                }

                return true;
            }),

        check('schedule.startTime')
            .if(check('schedule.enabled').equals('true'))
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .withMessage('MUST_BE_VALID_TIME_HH_MM'),

        check('schedule.matchDurationMinutes')
            .optional()
            .isInt({ min: 1 })
            .withMessage('MUST_BE_POSITIVE_INTEGER'),

        check('schedule.breakMinutes')
            .optional()
            .isInt({ min: 0 })
            .withMessage('MUST_BE_ZERO_OR_POSITIVE_INTEGER'),

        check('schedule.avoidBackToBackMatches')
            .optional()
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN'),

        check('schedule.minRestSlots')
            .optional()
            .isInt({ min: 0 })
            .withMessage('MUST_BE_ZERO_OR_POSITIVE_INTEGER'),

        check('schedule.balanceGroups')
            .optional()
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN'),

        validate,
    ],
    getGroupDistributionsByChampionship: [
        ...paramsValidator('championshipId', true),
        statusQueryValidator("status", allowedStatuses),
        validate,
    ],
    getGroupDistributionById: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupDistributionId', true),
        statusQueryValidator("status", allowedStatuses),
        validate,
    ],
    getGroupStandings: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupDistributionId', true),
        validate,
    ],
    scheduleGroupDistributionMatches: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupDistributionId', true),

        check('date')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .isISO8601()
            .withMessage('MUST_BE_VALID_DATE')
            .custom((value) => {
                if (!isTodayOrFutureDateInBogota(value)) {
                    throw new Error('DATE_MUST_BE_TODAY_OR_FUTURE');
                }

                return true;
            }),

        check('startTime')
            .exists()
            .withMessage('MISSING')
            .notEmpty()
            .withMessage('IS_EMPTY')
            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .withMessage('MUST_BE_VALID_TIME_HH_MM'),

        check('matchDurationMinutes')
            .optional()
            .isInt({ min: 1 })
            .withMessage('MUST_BE_POSITIVE_INTEGER'),

        check('breakMinutes')
            .optional()
            .isInt({ min: 0 })
            .withMessage('MUST_BE_ZERO_OR_POSITIVE_INTEGER'),

        check('avoidBackToBackMatches')
            .optional()
            .isBoolean()
            .withMessage('MUST_BE_BOOLEAN'),

        validate,
    ],
};


export function validateGroupDistributionRules(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const {
        minTeams,
        maxTeams,
        numberOfGroups,
        cantGroups,
        groupSizePreference,
        maxTeamsPerGroup,
    } = req.body;

    if (
        minTeams !== undefined &&
        maxTeams !== undefined &&
        Number(minTeams) > Number(maxTeams)
    ) {
        return res.status(400).json({
            success: false,
            message: 'minTeams cannot be greater than maxTeams',
        });
    }

    if (numberOfGroups !== undefined && cantGroups !== undefined) {
        return res.status(400).json({
            success: false,
            message: 'Use either numberOfGroups or cantGroups, not both',
        });
    }

    if (groupSizePreference && maxTeamsPerGroup) {
        return res.status(400).json({
            success: false,
            message:
                'Use either groupSizePreference or maxTeamsPerGroup, not both',
        });
    }

    return next();
}