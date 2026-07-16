import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';

export const validateCreateGroupDistribution = [
    param('championshipId')
        .notEmpty()
        .withMessage('championshipId is required')
        .isMongoId()
        .withMessage('championshipId must be a valid Mongo ID'),

    body('name')
        .optional()
        .isString()
        .withMessage('name must be a string')
        .isLength({ min: 3, max: 100 })
        .withMessage('name must be between 3 and 100 characters'),

    body('formatType')
        .optional()
        .isIn(['serpentine', 'linear', 'random', 'balancedByClub'])
        .withMessage(
            'formatType must be one of: serpentine, linear, random, balancedByClub'
        ),

    body('numberOfGroups')
        .optional()
        .isInt({ min: 2, max: 32 })
        .withMessage('numberOfGroups must be an integer between 2 and 32')
        .toInt(),

    body('cantGroups')
        .optional()
        .isInt({ min: 2, max: 32 })
        .withMessage('cantGroups must be an integer between 2 and 32')
        .toInt(),

    body('maxTeamsPerGroup')
        .optional()
        .isInt({ min: 2, max: 8 })
        .withMessage('maxTeamsPerGroup must be an integer between 2 and 8')
        .toInt(),

    body('groupSizePreference')
        .optional()
        .isIn(['preferGroupsOf3', 'preferGroupsOf4', 'preferGroupsOf5'])
        .withMessage(
            'groupSizePreference must be one of: preferGroupsOf3, preferGroupsOf4, preferGroupsOf5'
        ),

    body('avoidSameClub')
        .optional()
        .isBoolean()
        .withMessage('avoidSameClub must be a boolean')
        .toBoolean(),

    body('minTeams')
        .optional()
        .isInt({ min: 2, max: 64 })
        .withMessage('minTeams must be an integer between 2 and 64')
        .toInt(),

    body('maxTeams')
        .optional()
        .isInt({ min: 2, max: 64 })
        .withMessage('maxTeams must be an integer between 2 and 64')
        .toInt(),

    body('customRules')
        .optional()
        .isString()
        .withMessage('customRules must be a string'),
];


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