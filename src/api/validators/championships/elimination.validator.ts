import { param } from 'express-validator';
import { validate } from '../../middlewares';


export const EliminationBracketValidator = {

    generateBracket: [
        param('championshipId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        param('groupDistributionId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        validate
    ],
    getActiveBracket: [
        param('championshipId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        validate
    ],
    getBracketById: [
        param('championshipId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        param('eliminationBracketId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        validate
    ],
    getBracketByChampionship: [
        param('championshipId')
            .isMongoId()
            .withMessage('MUST_BE_MONGO_ID'),
        validate
    ],


};