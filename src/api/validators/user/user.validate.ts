import { validate } from "../../middlewares";
import { SocialUrlValidator } from "../custom";
import { optionalSocialUrl, password, requiredEmail, validateField } from "../expressValidatorHelper";

export const userValidation = {
    getUserById: [
        ...validateField("id", true),
        validate,
    ],
    createUser: [
        ...validateField("name", true),
        ...validateField("lastName", true),
        ...requiredEmail,
        ...validateField("nie", false),
        ...validateField("tag", false),
        ...validateField("avatar", true),
        ...validateField("description", false),
        ...validateField("nameBusiness", false),
        ...password("password", true),
        ...validateField("role", false),
        ...validateField("phone", true),
        ...validateField("address", false),
    
        optionalSocialUrl("urlTwitter", SocialUrlValidator.validateTwitterUrl, "twitter"),
        optionalSocialUrl("urlFacebook", SocialUrlValidator.validateFacebookUrl, "facebook"),
        optionalSocialUrl("urlInstagram", SocialUrlValidator.validateInstagramUrl, "instagram"),
        validate,
    ]
};
