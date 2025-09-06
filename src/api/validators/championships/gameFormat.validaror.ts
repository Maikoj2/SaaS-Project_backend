import { check, query } from "express-validator";
import { validate } from "../../middlewares";

export const gameFormatValidate = {
    getAll: [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),

        query('sort')
            .optional()
            .isString()
            .isIn(['name', 'createdAt'])
            .withMessage('Invalid sort field'),


        query('order')  
            .optional()
            .isIn(['1', '-1'])
            .withMessage('Order must be 1 or -1'),

        validate
    ],
    create: [
        check('name')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isString()
        .withMessage('IS_NOT_STRING')
        .isLength({ min: 3, max: 100 })
        .withMessage('NAME_LENGTH_3_100')
        .trim(),
        check('description')
        .exists()
        .withMessage('MISSING')
        .notEmpty()
        .withMessage('IS_EMPTY')
        .isString()
        .withMessage('IS_NOT_STRING')
        .isLength({ min: 3, max: 100 })
        .withMessage('DESCRIPTION_LENGTH_3_100')
        .trim(),
        check('config')
        .exists()
        .withMessage('MISSING')
        .isObject()
        .withMessage('IS_NOT_OBJECT'),
        validate



    ]


}