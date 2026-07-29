import type { CustomValidator } from "express-validator";
import type { IMatchRules } from "../../models/mongoose/championship/configuration";
import {
    CompetitionRulePreset,
    getVolleyballTypeByPreset
} from "../../domain/championship/rules/competitionRules.presets";

const isMatchRules = (value: unknown): value is Partial<IMatchRules> =>
    typeof value === "object" && value !== null;

export const validateMatchRulesSetRelationship: CustomValidator = (value: unknown) => {
    if (
        isMatchRules(value) &&
        value.setsToWin !== undefined &&
        value.maxSets !== undefined &&
        Number(value.maxSets) < Number(value.setsToWin)
    ) {
        throw new Error('MAX_SETS_MUST_BE_GREATER_THAN_OR_EQUAL_TO_SETS_TO_WIN');
    }

    return true;
};

export const validatePresetMatchRulesCompatibility: CustomValidator = (
    value: unknown,
    { req }
) => {
    if (
        !isMatchRules(value) ||
        value.volleyballType === undefined ||
        typeof req.body !== "object" ||
        req.body === null
    ) {
        return true;
    }

    const preset: unknown = req.body.competitionRulePreset;

    if (
        typeof preset !== "string" ||
        !Object.values(CompetitionRulePreset).includes(
            preset as CompetitionRulePreset
        )
    ) {
        return true;
    }

    const expectedVolleyballType = getVolleyballTypeByPreset(
        preset as CompetitionRulePreset
    );

    if (value.volleyballType !== expectedVolleyballType) {
        throw new Error('MATCH_RULES_VOLLEYBALL_TYPE_INCOMPATIBLE_WITH_PRESET');
    }

    return true;
};
