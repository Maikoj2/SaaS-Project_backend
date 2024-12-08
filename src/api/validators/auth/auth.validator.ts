import { check } from 'express-validator';
import { validate } from '../../middlewares/auth/validator.middleware';
import { RequestHandler } from 'express';
import { PasswordValidator } from './password.validator';

export const authValidation = {
    login: [
        check('email')
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .isEmail()
            .withMessage('EMAIL_IS_NOT_VALID')
            .normalizeEmail(),
        check('password')
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .isLength({
                min: 5
            })
            .withMessage('PASSWORD_TOO_SHORT_MIN_5'),
        validate

    ] as RequestHandler[],

    register: [
        check('name')
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .isLength({
                min: 2,
                max: 32
            })
            .withMessage('STRING_LENGTH_2_32'),
        check('email')
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .isEmail()
            .withMessage('EMAIL_IS_NOT_VALID')
            .normalizeEmail(),
        check('password')
            .exists()
            .withMessage('MISSING')
            .not()
            .isEmpty()
            .withMessage('IS_EMPTY')
            .isLength({
                min: 5
            })
            .withMessage('PASSWORD_TOO_SHORT_MIN_5')
            .custom((value: string) => {
                const validation = PasswordValidator.validate(value);
                if (!validation.isValid) {
                    throw new Error(validation.errors.join(', '));
                }
                return true;
            }),
        validate
    ] as RequestHandler[],

    forgotPassword: [
        check('email')
            .exists()
            .withMessage('EMAIL_IS_REQUIRED')
            .isEmail()
            .withMessage('EMAIL_IS_NOT_VALID'),
        validate
    ] as RequestHandler[],

    resetPassword:  [
        check('token')
          .exists()
          .withMessage('MISSING')
          .not()
          .isEmpty()
          .withMessage('IS_EMPTY'),
        check('newPassword')
          .exists()
          .withMessage('MISSING')
          .not()
          .isEmpty()
          .withMessage('IS_EMPTY')
          .isLength({
            min: 5
          })
          .withMessage('PASSWORD_TOO_SHORT_MIN_5'),
          // .custom((value) => {
            //     const validation = PasswordValidator.validate(value);
            //     if (!validation.isValid) {
            //         throw new Error(validation.errors.join(', '));
            //     }
            //     return true;
            // }),
        validate
    ] as RequestHandler[]
}
