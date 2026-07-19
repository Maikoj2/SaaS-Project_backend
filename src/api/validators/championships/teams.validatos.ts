import { check, param } from "express-validator";
import { paramsValidator, validateField } from "../expressValidatorHelper";
import { validateMongoIds } from "./championship.validator";
import { validate } from "../../middlewares";
import { searchQueryValidator, statusQueryValidator } from "../../utils/QueryParams.helper";


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

        validate,
    ],


    getTeamsByChampionship: [
        ...paramsValidator("championshipId", true),
        statusQueryValidator("status", ['active', 'inactive']),
        searchQueryValidator("search"),
        validate,
    ],

    getTeamById: [
        ...paramsValidator("teamId", true),
        validate,
    ],

}