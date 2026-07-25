import { body } from "express-validator";
import { validate } from "../../middlewares";
import { paramsValidator } from '../expressValidatorHelper/checkFieldTovalidate';

export const positionValidator = {

    assignPositions: [
        ...paramsValidator("championshipId", true),
        validate,
    ],
    manualAssignPositions: [
        ...paramsValidator("championshipId", true),
        body('positions')
            .isArray({ min: 1 })
            .withMessage('INVALID_POSITIONS').custom((positions) => {
                const teamIds = positions.map((item: any) => item.teamId);
                const uniqueTeamIds = new Set(teamIds);

                if (uniqueTeamIds.size !== teamIds.length) {
                    throw new Error('DUPLICATED_TEAM_ID');
                }

                const positionNumbers = positions.map((item: any) => item.position);
                const uniquePositions = new Set(positionNumbers);

                if (uniquePositions.size !== positionNumbers.length) {
                    throw new Error('DUPLICATED_POSITION');
                }

                return true;
            }),

        body('positions.*.teamId')
            .isMongoId()
            .withMessage('INVALID_TEAM_ID'),

        body('positions.*.position')
            .isInt({ min: 1 })
            .withMessage('INVALID_POSITION'),

        validate,
    ],
    assignPositionByRegistrationId: [
        ...paramsValidator("registrationId", true),
        body("position").isInt({ min: 1 }).withMessage("INVALID_POSITION"),
        validate,
    ],




}