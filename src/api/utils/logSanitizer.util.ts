const REDACTED = '***REDACTED***';

const SENSITIVE_KEYS = new Set([
    'password',
    'newpassword',
    'oldpassword',
    'token',
    'refreshtoken',
    'accesstoken',
    'authorization',
    'session',
    'verificationcode',
    'urlid',
    'verificationid',
]);

const isSensitiveKey = (key: string): boolean => SENSITIVE_KEYS.has(key.toLowerCase());

const sanitizeValue = (value: unknown): unknown => {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }

    if (typeof value === 'object') {
        return sanitizeForLog(value as Record<string, unknown>);
    }

    return value;
};

/**
 * Redacts sensitive fields from objects before logging.
 */
export const sanitizeForLog = <T extends Record<string, unknown>>(data: T): T => {
    const sanitized = {} as T;

    for (const [key, value] of Object.entries(data)) {
        if (isSensitiveKey(key)) {
            (sanitized as Record<string, unknown>)[key] = REDACTED;
            continue;
        }

        (sanitized as Record<string, unknown>)[key] = sanitizeValue(value);
    }

    return sanitized;
};

/**
 * Redacts sensitive HTTP headers (e.g. Authorization) before logging.
 */
export const sanitizeHeadersForLog = (
    headers: Record<string, unknown> | undefined
): Record<string, unknown> | undefined => {
    if (!headers) {
        return headers;
    }

    return sanitizeForLog(headers);
};

/**
 * Sanitizes URLs to remove sensitive parameters from query strings
 * and path parameters (like verification codes in /verify/:tenant/:verificationCode).
 */
export const sanitizeUrl = (url: string): string => {
    if (!url) return url;

    const [pathPart, queryPart] = url.split('?');

    const pathSegments = pathPart.split('/');
    const verifyIndex = pathSegments.indexOf('verify');
    if (verifyIndex !== -1 && verifyIndex + 2 < pathSegments.length) {
        pathSegments[verifyIndex + 2] = '***REDACTED***';
    }

    let sanitizedPath = pathSegments.join('/');

    if (queryPart) {
        try {
            const params = new URLSearchParams(queryPart);
            params.forEach((_, key) => {
                if (isSensitiveKey(key)) {
                    params.set(key, '***REDACTED***');
                }
            });
            sanitizedPath += '?' + params.toString();
        } catch {
            sanitizedPath += '?' + queryPart;
        }
    }

    return sanitizedPath;
};
