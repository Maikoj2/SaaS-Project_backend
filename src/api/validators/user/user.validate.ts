import { validate } from "../../middlewares";
import { SocialUrlValidator } from "../custom";
import { optionalSocialUrl, paramsValidator, password, requiredEmail, validateField } from "../expressValidatorHelper";
import { query } from 'express-validator';


export const userValidation = {
    getUserById: [
        ...paramsValidator("id"),
        validate,
    ],
    createUser: [
        ...validateField("name", true),
        ...validateField("lastName", true),
        ...requiredEmail,
        ...validateField("nie", false),
        ...validateField("tag", false),
        ...validateField("avatar", false),
        ...validateField("description", false),
        ...validateField("nameBusiness", false),
        ...validateField("street", false),
        ...validateField("city", false),
        ...validateField("country", false),
        ...validateField("postalCode", false),
        ...validateField("department", false),
        ...password("password", true),
        ...validateField("role", false),
        ...validateField("phone", true),
        ...validateField("address", false),

        optionalSocialUrl("urlTwitter", SocialUrlValidator.validateTwitterUrl, "twitter"),
        optionalSocialUrl("urlFacebook", SocialUrlValidator.validateFacebookUrl, "facebook"),
        optionalSocialUrl("urlInstagram", SocialUrlValidator.validateInstagramUrl, "instagram"),
        validate,
    ],
    updateUser: [
        ...paramsValidator("id", true),
        validateField("name", false),
        validateField("lastName", false),
        validateField("avatar", false),
        validateField("nie", false),
        validateField("description", false),
        validateField("nameBusiness", false),
        validateField("phone", false),
        validateField("street", false),
        validateField("city", false),
        validateField("country", false),
        validateField("postalCode", false),
        validateField("department", false),
        optionalSocialUrl("urlTwitter", SocialUrlValidator.validateTwitterUrl, "twitter"),
        optionalSocialUrl("urlFacebook", SocialUrlValidator.validateFacebookUrl, "facebook"),
        optionalSocialUrl("urlInstagram", SocialUrlValidator.validateInstagramUrl, "instagram"),
        validate,
    ],
    getUsers: [
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
            .isIn(['name', 'email', 'createdAt', 'role'])
            .withMessage('Invalid sort field'),

        query('order')
            .optional()
            .isIn(['1', '-1'])
            .withMessage('Order must be 1 or -1'),

        validate
    ],

    deleteUser: [
        ...paramsValidator("id", true),
        validate,
    ],
};

