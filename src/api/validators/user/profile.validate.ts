import { validate } from "../../middlewares";
import { SocialUrlValidator } from "../custom";
import { optionalSocialUrl, password, stepper, validateField } from "../expressValidatorHelper";

// Validaciones del perfil
export const profileValidation = {
    updateProfile: [
        ...validateField("name", true),
        ...validateField("phone", true),
        ...validateField("city", true),
        ...validateField("country", true),

        optionalSocialUrl("urlTwitter", SocialUrlValidator.validateTwitterUrl, "twitter"),
        optionalSocialUrl("urlFacebook", SocialUrlValidator.validateFacebookUrl, "facebook"),
        optionalSocialUrl("urlInstagram", SocialUrlValidator.validateInstagramUrl, "instagram"),

        validate,
    ],
};

export const changePasswordValidation = {
    changePassword: [
        ...password('newPassword', true),
        ...password('oldPassword', false),
        validate,
    ]
}

export const stepperValidation = {
    stepper: [
        ...stepper,
        validate,
    ]
}
