import type { CustomValidator } from "express-validator";
import type { IEliminationSettings } from "../../models/mongoose/championship/configuration";

type ConfigurationPayload = {
    maxTeams?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

const isEliminationSettings = (
    value: unknown
): value is Partial<IEliminationSettings> => isObject(value);

export const validateEliminationSettingsRelationships: CustomValidator = (
    value: unknown,
    { req }
) => {
    if (!isEliminationSettings(value) || value.enabled !== true) {
        return true;
    }

    const requestBody: ConfigurationPayload = isObject(req.body)
        ? req.body
        : {};
    const maxTeams = requestBody.maxTeams;
    const totalQualifiers = value.totalQualifiers;
    const bracketSize = value.bracketSize;

    if (
        maxTeams !== undefined &&
        totalQualifiers !== undefined &&
        Number(totalQualifiers) > Number(maxTeams)
    ) {
        throw new Error('TOTAL_QUALIFIERS_MUST_BE_LESS_THAN_OR_EQUAL_TO_MAX_TEAMS');
    }

    if (
        totalQualifiers !== undefined &&
        bracketSize !== undefined &&
        Number(bracketSize) !== Number(totalQualifiers)
    ) {
        throw new Error('BRACKET_SIZE_MUST_BE_EQUAL_TO_TOTAL_QUALIFIERS');
    }

    return true;
};
