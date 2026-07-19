// src/utils/queryParamHelper.ts

import { query } from 'express-validator';
import { ParsedQs } from 'qs';

/**
 * Convierte un parámetro de consulta a un número.
 * @param param - El parámetro de consulta a convertir.
 * @param defaultValue - El valor por defecto si la conversión falla.
 * @returns El número convertido o el valor por defecto.
 */
export function parseQueryParamToNumber(param: string | ParsedQs | string[] | ParsedQs[] | undefined, defaultValue: number): number {
    if (typeof param === 'string') {
        const parsed = parseInt(param, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
}

export const statusQueryValidator = (paramName: string, allowedStatuses: string[]) =>
    query(paramName)
        .optional()
        .isIn(allowedStatuses)
        .withMessage(
            `${paramName}_MUST_BE_ONE_OF_${allowedStatuses.join('_OR_')}`
        );

export const searchQueryValidator = (paramName: string) =>
    query(paramName)
        .optional()
        .isString()
        .trim()
        .isLength({ min: 3 })
        .withMessage(
            `${paramName.toUpperCase()}_MUST_BE_AT_LEAST_3_CHARACTERS`
        );
