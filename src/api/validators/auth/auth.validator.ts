
import { validate } from '../../middlewares';
import { password, requiredEmail, validateField } from '../expressValidatorHelper';

export const authValidation = {
    login: [
        ...requiredEmail,
        ...password('password', false),
        validate
    ],

    register: [
        ...validateField('name', true),
        ...requiredEmail,
        ...password('password', false),
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
