import { body, check, param } from "express-validator";
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

    updateTeamManually: [
        ...paramsValidator("championshipId", true),
        ...paramsValidator("teamId", true),
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
        check('status')
            .optional()
            .isIn(['pending', 'active', 'inactive', 'rejected'])
            .withMessage('Status must be pending, active, inactive or rejected'),
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
        body()
            .custom((value) => {
                const allowedFields = [
                    'name',
                    'logo',
                    'categoryId',
                    'captainId',
                    'players',
                    'status',
                ];

                const receivedFields = Object.keys(value);

                const hasAtLeastOneAllowedField = receivedFields.some((field) =>
                    allowedFields.includes(field)
                );

                if (!hasAtLeastOneAllowedField) {
                    throw new Error(
                        'At least one valid field must be provided'
                    );
                }

                const invalidFields = receivedFields.filter(
                    (field) => !allowedFields.includes(field)
                );

                if (invalidFields.length > 0) {
                    throw new Error(
                        `Invalid fields: ${invalidFields.join(', ')}`
                    );
                }

                return true;
            }),

        validate,
    ],

    addPlayerToTeam: [
        ...paramsValidator("teamId", true),
        ...paramsValidator("championshipId", true),

        check('playerId')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),

        validate,
    ],

    removePlayerFromTeam: [
        ...paramsValidator("teamId", true),
        ...paramsValidator("championshipId", true),

        ...paramsValidator("playerId", true),

        validate,
    ],

    replacePlayerInTeam: [
        ...paramsValidator("championshipId", true),
        ...paramsValidator("teamId", true),

        check('oldPlayerId')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),

        check('newPlayerId')
            .exists()
            .withMessage('MISSING')
            .bail()
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT')
            .custom((newPlayerId, { req }) => {
                if (newPlayerId === req.body.oldPlayerId) {
                    throw new Error('PLAYERS_MUST_BE_DIFFERENT');
                }

                return true;
            }),

        validate,
    ],


}