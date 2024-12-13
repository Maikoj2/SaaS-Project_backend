import { check, CustomValidator, param } from "express-validator";
import { PasswordValidator } from "../auth";

export const validateField = (field: string, optional: boolean) => {
    if (!optional) {
        return [
            check(field)
                .optional()
                .notEmpty()
                .withMessage('IS_EMPTY_IF_PROVIDED')
                .trim(),
        ];
    }

    return [
        check(field)
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .trim(),
    ];
}

export const optionalSocialUrl = (field: string, validator: CustomValidator, networkName: string) => [
    check(field)
        .optional()
        .custom(validator)
        .withMessage(`INVALID_${networkName.toUpperCase()}_URL`)
];

export const password = (field: string, validate: boolean) => [
    check(field)
        .exists()
        .withMessage('FIELD_REQUIRED')
        .not()
        .isEmpty()
        .withMessage('FIELD_EMPTY')
        .isLength({ min: 5 })
        .withMessage('PASSWORD_TOO_SHORT_MIN_5')
        .custom((value: string) => {
            if (validate) {
                const validation = PasswordValidator.validate(value);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(', '));
                }
            }
            return true;
        }),
];

export const requiredEmail = [
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

export const paramsValidator = (field: string) => [
    param(field)
        .trim()
        .notEmpty()
        .withMessage('MISSING')
        .isString()
        .withMessage('INVALID_TYPE'),
]

export const stepper = [
    check('stepper')
        .exists()
]


