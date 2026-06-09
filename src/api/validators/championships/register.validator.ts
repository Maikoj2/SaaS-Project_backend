import { body, check, param } from "express-validator";
import { validate } from "../../middlewares";

export const validateRegistration = [
    param('code')
        .isString()
        .isLength({ min: 10, max: 10 })
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage('Invalid invitation code format'),
    check('teamId').isMongoId().withMessage('INVALID_MONGO_ID'),
    body('payerData').isObject().withMessage('INVALID_PAYER_DATA'),
    validate,
];