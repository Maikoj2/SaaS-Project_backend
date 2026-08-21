import type { Request } from 'express';
import { validationResult } from 'express-validator';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('../../../src/api/middlewares', () => ({
    validate: vi.fn(),
}));

vi.mock('../../../src/api/validators/expressValidatorHelper', () => ({
    paramsValidator: vi.fn(() => []),
}));

import { validateInvitationLinkExpiresAt } from '../../../src/api/validators/championships/generatelink.validator';

const NOW = new Date('2026-07-29T12:00:00.000Z');
const REGISTRATION_DEADLINE = new Date('2026-08-29T23:59:59.000Z');
const VALID_EXPIRATION = '2026-08-20T23:30:00.000Z';

async function validateExpiresAt(expiresAt: unknown) {
    const request = {
        body: { expiresAt },
        championshipConfiguration: {
            registrationDeadline: REGISTRATION_DEADLINE,
        },
    } as unknown as Request;

    await validateInvitationLinkExpiresAt.run(request);
    return validationResult(request);
}

describe('InvitationLink expiresAt HTTP validation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('accepts the complete ISO payload received from frontend', async () => {
        const result = await validateExpiresAt(VALID_EXPIRATION);

        expect(result.isEmpty()).toBe(true);
    });

    it('accepts expiresAt equal to registrationDeadline', async () => {
        const result = await validateExpiresAt(
            REGISTRATION_DEADLINE.toISOString()
        );

        expect(result.isEmpty()).toBe(true);
    });

    it.each([
        [
            'past',
            '2026-07-29T11:59:59.999Z',
            'expiresAt must be in the future',
        ],
        [
            'equal to now',
            NOW.toISOString(),
            'expiresAt must be in the future',
        ],
        [
            'after registrationDeadline',
            '2026-08-30T00:00:00.000Z',
            'expiresAt must be before or equal to registrationDeadline',
        ],
        [
            'invalid string',
            'not-a-date',
            'expiresAt must be a valid ISO date',
        ],
        [
            'empty string',
            '',
            'expiresAt must be a valid ISO date',
        ],
    ])('rejects %s with a specific message', async (
        _case,
        expiresAt,
        message
    ) => {
        const result = await validateExpiresAt(expiresAt);

        expect(result.isEmpty()).toBe(false);
        expect(result.array()[0]).toMatchObject({
            path: 'expiresAt',
            msg: message,
        });
    });
});
