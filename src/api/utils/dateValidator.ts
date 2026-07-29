import { CustomValidator } from "express-validator";

const parseValidDate = (value: unknown): Date | null => {
    if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        !(value instanceof Date)
    ) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const validateDate: CustomValidator = (value) => {
    const date = new Date(value);
    if (date < new Date()) {
        throw new Error('DATE_MUST_BE_FUTURE');
    }
    return true;
};

export const validateRegistrationDeadlineBeforeStart: CustomValidator = (
    value: unknown,
    { req }
) => {
    const registrationDeadline = parseValidDate(value);
    const requestBody: unknown = req.body;
    const startDate = (
        typeof requestBody === "object" &&
        requestBody !== null &&
        "startDate" in requestBody
    )
        ? parseValidDate(requestBody.startDate)
        : null;

    if (
        registrationDeadline &&
        startDate &&
        registrationDeadline >= startDate
    ) {
        throw new Error('REGISTRATION_DEADLINE_MUST_BE_BEFORE_START_DATE');
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
