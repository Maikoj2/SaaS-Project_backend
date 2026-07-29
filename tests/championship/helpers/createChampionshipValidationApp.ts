import express, {
    type Request,
    type RequestHandler,
    type Response,
} from 'express';
import { vi } from 'vitest';

vi.mock('../../../src/api/middlewares', async () => {
    const validatorMiddleware = await import(
        '../../../src/api/middlewares/auth/validator.middleware'
    );
    return {
        validate: validatorMiddleware.validate,
    };
});

vi.mock('../../../src/api/validators/auth', () => ({
    PasswordValidator: {
        validate: () => ({ isValid: true, errors: [] }),
    },
}));

import {
    validateCreateChampionship,
    validateCreateChampionshipConfiguration,
} from '../../../src/api/validators/championships/championship.validator';

export const BASE_CREATE_CHAMPIONSHIP_PAYLOAD = {
    name: 'Torneo de regresión',
    description: 'Payload válido de referencia para las pruebas P0',
    startDate: '2026-08-30T08:00:00.000Z',
    endDate: '2026-09-02T20:00:00.000Z',
    maxTeams: 8,
    registrationDeadline: '2026-08-29T20:00:00.000Z',
    registrationFee: 0,
    competitionRulePreset: 'BEACH_OPEN_2V2',
    distributionStrategy: 'linear',
    matchRules: {
        volleyballType: 'beach',
        setsToWin: 2,
        maxSets: 3,
        regularSetPoints: 21,
        tieBreakPoints: 15,
        minimumPointDifference: 2,
    },
};

export function createChampionshipValidationApp() {
    const app = express();
    app.use(express.json());

    app.post(
        '/championship',
        [
            ...validateCreateChampionship,
            ...validateCreateChampionshipConfiguration,
        ] as RequestHandler[],
        (_req: Request, res: Response) => {
            res.status(201).json({ success: true });
        },
    );

    return app;
}
