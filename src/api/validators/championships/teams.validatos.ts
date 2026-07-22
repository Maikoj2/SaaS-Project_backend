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

    createTeamManually: [
        ...paramsValidator("championshipId", true),
        ...validateField("name", true),
        ...validateField("logo", false),
        check("players")
            .optional()
            .isArray({ min: 1 })
            .withMessage('MUST_BE_ARRAY'),
        check('players.*')
            .isMongoId()
            .withMessage('Each player must be a valid Mongo ID'),
        check('captainId')
            .optional()
            .isMongoId()
            .withMessage('Captain ID must be a valid Mongo ID'),
        check('categoryId')
            .optional()
            .isString()
            .withMessage('Category ID must be a valid Mongo ID'),
        check('registrationStatus')
            .optional()
            .isIn(['pending', 'confirmed', 'rejected'])
            .withMessage('Registration status must be pending, confirmed or rejected'),
        ...validateField("clubId", false),
        check('feePaid')
            .optional()
            .isBoolean()
            .withMessage('feePaid must be boolean'),

        validate,
    ],


}