import { check } from "express-validator";
import { paramsValidator } from "../expressValidatorHelper";
import { validate } from "../../middlewares";
import { statusQueryValidator } from "../../utils/QueryParams.helper";




export const courtValidator = {

    CreateCourt: [
        check('championshipId')
            .exists()
            .withMessage('MISSING')
            .isMongoId()
            .withMessage('INVALID_ID_FORMAT'),
        check('name')
            .exists()
            .withMessage('MISSING')
            .isString()
            .withMessage('INVALID_STRING_FORMAT'),
        check('type')
            .exists()
            .withMessage('MISSING')
            .isIn(['indoor', 'beach'])
            .withMessage('INVALID_TYPE'),
        check('status')
            .exists()
            .withMessage('MISSING')
            .isIn(['available', 'occupied', 'maintenance'])
            .withMessage('INVALID_STATUS'),
        check('capacity')
            .exists()
            .withMessage('MISSING')
            .isInt({ min: 1 })
            .withMessage('INVALID_NUMBER'),
        check('location')
            .optional()
            .isString()
            .withMessage('INVALID_STRING_FORMAT'),
        check('dimensions')
            .optional()
            .isString()
            .withMessage('INVALID_STRING_FORMAT'),
        check('surface')
            .optional()
            .isString()
            .withMessage('INVALID_STRING_FORMAT'),
        validate,
    ],
    getCourts: [
        ...paramsValidator("championshipId", true),
        statusQueryValidator("status", ['available', 'occupied', 'maintenance']),
        validate,
    ],
    getCourtById: [
        ...paramsValidator("championshipId", true),
        ...paramsValidator("courtId", true),
        validate,
    ],

    getAvailableCourtsByChampionship: [
        ...paramsValidator("championshipId", true),
        statusQueryValidator("status", ['available', 'occupied', 'maintenance']),
        statusQueryValidator("type", ['indoor', 'beach']),
        validate,
    ],

};
