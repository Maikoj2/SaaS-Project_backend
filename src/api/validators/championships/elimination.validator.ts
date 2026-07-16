import { param } from 'express-validator';
import { validate } from '../../middlewares';


export const generateEliminationBracketValidator = [
    param('championshipId')
        .isMongoId()
        .withMessage('MUST_BE_MONGO_ID'),
    param('groupDistributionId')
        .isMongoId()
        .withMessage('MUST_BE_MONGO_ID'),
    validate
];