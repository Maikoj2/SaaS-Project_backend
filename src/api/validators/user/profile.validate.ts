import { check } from "express-validator";
import { validate } from "../../middlewares";
import { SocialUrlValidator } from "../custom";
import { CustomValidator } from 'express-validator';

// Función reutilizable para campos obligatorios
const requiredField = (field: string) => [
    check(field)
        .exists()
        .withMessage('FIELD_REQUIRED')
        .not()
        .isEmpty()
        .withMessage('FIELD_EMPTY')
        .trim(),
];
// Función para campos opcionales
const optionalField = (field: string) => [
    check(field)
        .optional()
        .notEmpty()
        .withMessage('FIELD_EMPTY_IF_PROVIDED')
        .trim(),
];
// Función para URLs sociales opcionales
const optionalSocialUrl = (field: string, validator: CustomValidator, networkName: string) => 
    check(field)
        .optional()
        .custom(validator)
        .withMessage(`INVALID_${networkName.toUpperCase()}_URL`);

// Validaciones del perfil
export const profileValidation = {
    updateProfile: [
        ...requiredField("name"),
        ...requiredField("phone"),
        ...optionalField("city"),
        ...requiredField("country"),
        
        optionalSocialUrl("urlTwitter", SocialUrlValidator.validateTwitterUrl, "twitter"),
        optionalSocialUrl("urlFacebook", SocialUrlValidator.validateFacebookUrl, "facebook"),
        optionalSocialUrl("urlInstagram", SocialUrlValidator.validateInstagramUrl, "instagram"),
        
        validate,
    ],
};