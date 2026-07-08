// src/utils/queryParamHelper.ts

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