import { body, check, param } from 'express-validator';
import { validate } from '../../middlewares';


export const validateGenerateInvitationLink = [
    param('id')
        .isString()
        .withMessage('MUST_BE_STRING')
        .isMongoId()
        .withMessage('MUST_BE_MONGO_ID'),
    check('maxUses')
        .isInt()
        .withMessage('MUST_BE_INTEGER'),
    check('expiresAt')
        .isDate()
        .withMessage('MUST_BE_DATE'),
    validate,
];


export const validateUseInvitationLink = [
    check('code')
        .notEmpty()
        .withMessage('MUST_NOT_BE_EMPTY')
        .isString()
        .withMessage('MUST_BE_STRING'),
    validate,
];