import { body, query } from 'express-validator';

import { validate } from '../../middlewares';
import { paramsValidator } from '../expressValidatorHelper';


const allowedMatchStatuses = [
    'scheduled',
    'in_progress',
    'finished',
    'walkover',
    'cancelled',
];

const statusQueryValidator = () => query('status')
    .optional()
    .isIn(allowedMatchStatuses)
    .withMessage(
        'STATUS_MUST_BE_SCHEDULED_IN_PROGRESS_FINISHED_WALKOVER_OR_CANCELLED'
    );

const matchValidator = {
    registerMatchResult: [
        ...paramsValidator('matchId', true),

        body('sets')
            .optional()
            .isArray({ min: 1, max: 5 })
            .withMessage('SETS_MUST_BE_AN_ARRAY_BETWEEN_1_AND_5')
            .bail()
            .custom((sets) => {
                const validSets = sets.every(
                    (set: unknown) => {
                        if (
                            typeof set !== 'object' ||
                            set === null
                        ) {
                            return false;
                        }

                        const currentSet = set as {
                            homeTeam?: unknown;
                            awayTeam?: unknown;
                        };

                        return (
                            Number.isInteger(currentSet.homeTeam) &&
                            Number.isInteger(currentSet.awayTeam) &&
                            Number(currentSet.homeTeam) >= 0 &&
                            Number(currentSet.awayTeam) >= 0
                        );
                    }
                );

                if (!validSets) {
                    throw new Error(
                        'EACH_SET_MUST_HAVE_NON_NEGATIVE_INTEGER_SCORES'
                    );
                }

                return true;
            }),

        body('walkoverWinnerId')
            .optional()
            .isMongoId()
            .withMessage('WALKOVER_WINNER_ID_MUST_BE_MONGO_ID'),

        body().custom((_body, { req }) => {
            const hasSets =
                Array.isArray(req.body.sets) &&
                req.body.sets.length > 0;

            const hasWalkoverWinner =
                typeof req.body.walkoverWinnerId === 'string' &&
                req.body.walkoverWinnerId.trim().length > 0;

            if (!hasSets && !hasWalkoverWinner) {
                throw new Error(
                    'SETS_OR_WALKOVER_WINNER_ID_IS_REQUIRED'
                );
            }

            if (hasSets && hasWalkoverWinner) {
                throw new Error(
                    'SEND_SETS_OR_WALKOVER_WINNER_ID_NOT_BOTH'
                );
            }

            return true;
        }),

        validate,
    ],

    getMatchesByChampionship: [
        ...paramsValidator('championshipId', true),
        statusQueryValidator(),

        query('isEliminationMatch')
            .optional()
            .isIn(['true', 'false'])
            .withMessage(
                'IS_ELIMINATION_MATCH_MUST_BE_TRUE_OR_FALSE'
            ),

        query('groupId')
            .optional()
            .isMongoId()
            .withMessage('GROUP_ID_MUST_BE_MONGO_ID'),

        query('eliminationBracketId')
            .optional()
            .isMongoId()
            .withMessage(
                'ELIMINATION_BRACKET_ID_MUST_BE_MONGO_ID'
            ),
        validate,
    ],

    getMatchById: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('matchId', true),
        validate,
    ],

    getMatchesByGroup: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('groupId', true),
        statusQueryValidator,
        validate,
    ],

    getMatchesByEliminationBracket: [
        ...paramsValidator('championshipId', true),
        ...paramsValidator('eliminationBracketId', true),
        statusQueryValidator(),
        validate,
    ],
};

export default matchValidator;