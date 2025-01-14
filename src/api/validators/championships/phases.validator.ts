import { validate } from "../../middlewares";
import { paramsValidator, validateField } from "../expressValidatorHelper";

export const phasesValidator = {
    createPhases: [
        paramsValidator('championshipId', true),
        validateField('gameFormatId', true),
        validateField('startTime', true),
        validate
    ]
}