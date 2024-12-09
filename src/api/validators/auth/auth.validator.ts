import { check } from 'express-validator';
import { validate } from '../../middlewares';
import { PasswordValidator } from './password.validator';
import { CustomValidator } from 'express-validator';

// Campos requeridos
const requiredField = (field: string) => [
    check(field)
        .exists()
        .withMessage('MISSING')
        .not()
        .isEmpty()
        .withMessage('IS_EMPTY')
        .trim(),
];

// Campos opcionales
const optionalField = (field: string) => [
    check(field)
        .optional()
        .notEmpty()
        .withMessage('IS_EMPTY_IF_PROVIDED')
        .trim(),
];

// Email requerido
const requiredEmail = [
    check('email')
        .exists()
        .withMessage('MISSING')
        .not()
        .isEmpty()
        .withMessage('IS_EMPTY')
        .isEmail()
        .withMessage('EMAIL_IS_NOT_VALID')
        .normalizeEmail(),
];

// Password requerido con validación
const requiredPassword = [
    check('password')
        .exists()
        .withMessage('MISSING')
        .not()
        .isEmpty()
        .withMessage('IS_EMPTY')
        .isLength({ min: 5 })
        .withMessage('PASSWORD_TOO_SHORT_MIN_5')
        .custom((value: string) => {
            const validation = PasswordValidator.validate(value);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }
            return true;
        }),
];

export const authValidation = {
    login: [
        ...requiredEmail,
        ...requiredPassword,
        validate
    ],

    register: [
        ...requiredField('name'),
        ...requiredEmail,
        ...requiredPassword,
        validate
    ],

    forgotPassword: [
        ...requiredEmail,
        validate
    ],

    resetPassword: [
        ...requiredField('token'),
        ...requiredPassword,
        validate
    ],
};
