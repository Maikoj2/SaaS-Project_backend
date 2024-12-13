
import { validate } from '../../middlewares';
import { paramsValidator, password, requiredEmail, validateField } from '../expressValidatorHelper';

export const authValidation = {
    login: [
        ...requiredEmail,
        ...password('password', false),
        validate
    ],

    verify: [
        ...paramsValidator('tenant'),
        ...paramsValidator('verificationCode'),
        validate
    ],

    register: [
        ...validateField('name', true),
        ...requiredEmail,
        ...password('password', false),
        ...validateField('userReferred', false),
        validate
    ],

    forgotPassword: [
        ...requiredEmail,
        validate
    ],

    resetPassword: [
        ...validateField('token', true),
        ...password('newPassword', true),
        validate
    ],
};
