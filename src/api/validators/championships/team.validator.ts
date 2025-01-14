import { check, param } from "express-validator";
import { paramsValidator, validateField } from "../expressValidatorHelper";
import { validateMongoIds } from "./campionship.validator";

export const teamValidator = {

    createTeamByLink: [
        ...paramsValidator("code", false),
        ...validateField("name", true),
        ...validateField("logo", false),
        check("players")
            .optional()
            .isArray()
            .withMessage('MUST_BE_ARRAY')
            .custom(validateMongoIds),
        ...validateField("clubId", false),
    
        ...validateField("status", false),

    ],
}