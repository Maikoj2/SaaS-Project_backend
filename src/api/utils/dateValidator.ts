import { CustomValidator } from "express-validator";

export const validateDate: CustomValidator = (value) => {
    const date = new Date(value);
    if (date < new Date()) {
        throw new Error('DATE_MUST_BE_FUTURE');
    }
    return true;
};

// Validador de fecha fin
export const validateEndDate: CustomValidator = (value, { req }) => {
    const endDate = new Date(value);
    const startDate = new Date(req.body.startDate);
    if (endDate <= startDate) {
        throw new Error('END_DATE_MUST_BE_AFTER_START');
    }
    return true;
};