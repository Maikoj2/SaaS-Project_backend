import { body, check, param } from "express-validator";
import { validate } from "../../middlewares";

export const validateRegistration = [
    param('code')
        .isString()
        .isLength({ min: 10, max: 10 })
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage('Invalid invitation code format'),
    check('teamId').isMongoId().withMessage('INVALID_MONGO_ID'),
    body('payerData').isObject().withMessage('INVALID_PAYER_DATA').custom((value) => {
        if (!value.name) {
            throw new Error('INVALID_PAYER_NAME');
        }
        if (!value.surname) {
            throw new Error('INVALID_PAYER_SURNAME');
        }
        if (!value.email) {
            throw new Error('INVALID_PAYER_EMAIL');
        }
        if (!value.areaCode) {
            throw new Error('INVALID_PAYER_AREA_CODE');
        }
        if (!value.phoneNumber) {
            throw new Error('INVALID_PAYER_PHONE_NUMBER');
        }
        if (!value.address) {
            throw new Error('INVALID_PAYER_ADDRESS');
        }
        return true;
    }),
    validate,
];