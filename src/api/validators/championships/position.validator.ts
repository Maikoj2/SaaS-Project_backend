import { body, check, param } from "express-validator";
import { validate } from "../../middlewares";
import {  validateField } from "../expressValidatorHelper";
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
            .withMessage('INVALID_POSITIONS'),

        body('positions.*.teamId')
            .isMongoId()
            .withMessage('INVALID_TEAM_ID'),

        body('positions.*.position')
            .isInt({ min: 1 })
            .withMessage('INVALID_POSITION'),

        validate,
    ],
    

}