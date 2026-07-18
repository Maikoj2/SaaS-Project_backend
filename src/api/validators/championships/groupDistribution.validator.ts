import { Request, Response, NextFunction } from 'express';
import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';
import { statusQueryValidator } from '../../utils/QueryParams.helper';

const allowedStatuses = ['active', 'draft', 'finalized',];



export const validateGroupDistribution = {
    createGroupDistribution: [
        ...paramsValidator('championshipId', true),
        validate,
    ],
    getGroupDistributionsByChampionship: [
        ...paramsValidator('championshipId', true),
        statusQueryValidator(allowedStatuses),
        validate,
    ],
    getGroupDistributionById: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupDistributionId', true),
        statusQueryValidator(allowedStatuses),
        validate,
    ],
    getGroupStandings: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupDistributionId', true),
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