import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';
import { statusQueryValidator } from '../../utils/QueryParams.helper';
import { check } from 'express-validator';

const allowedStatuses = ['active', 'draft', 'finalized',];



export const validateGroupDistribution = {
    createGroupDistribution: [
        ...paramsValidator('championshipId', true),
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
            .withMessage('MUST_BE_VALID_DATE'),

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