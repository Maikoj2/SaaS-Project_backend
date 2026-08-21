import { body, check, param } from 'express-validator';
import { validate } from '../../middlewares';
import Championship, { IChampionshipDocument } from '../../models/mongoose/championship/championship';
import { InvitationLinkService } from '../../services/championship/invitationLink.service';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import InvitationLink from '../../models/mongoose/championship/invitationLink';
import { IUserCustomRequest } from '../../interfaces';
import { paramsValidator } from '../expressValidatorHelper';

const linkService = new InvitationLinkService();

export const validateInvitationLinkExpiresAt = body('expiresAt')
    .notEmpty()
    .withMessage('expiresAt must be a valid ISO date')
    .bail()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('expiresAt must be a valid ISO date')
    .bail()
    .custom((value: string, { req }) => {
        const expiresDate = new Date(value);

        if (expiresDate.getTime() <= Date.now()) {
            throw new Error('expiresAt must be in the future');
        }

        const championshipConfiguration = (
            req as typeof req & {
                championshipConfiguration?: {
                    registrationDeadline?: Date | string;
                };
            }
        ).championshipConfiguration;

        if (championshipConfiguration?.registrationDeadline) {
            const registrationDeadline = new Date(
                championshipConfiguration.registrationDeadline
            );

            if (expiresDate > registrationDeadline) {
                throw new Error(
                    'expiresAt must be before or equal to registrationDeadline'
                );
            }
        }

        return true;
    });

export const validateGenerateInvitationLink = [
    param('championshipId')
        .isMongoId()
        .withMessage('MUST_BE_MONGO_ID')
        .custom(async (value: string, { req }) => {
            const tenant = req.clientAccount as string;
            // search championship including tenant for security
            const championshipConfiguration = await DatabaseHelper.findOneWithRelations(
                ChampionshipConfiguration,
                tenant,
                { championshipId: value },
                { nested: [{ path: 'championshipId' }] },
                {
                    throwError: true,
                    errorMessage: 'CHAMPIONSHIP_NOT_FOUND'
                }
            );


            (req as any).championshipConfiguration = championshipConfiguration;
            const link = await linkService.findUsableLink(req.clientAccount, value);
            if (link) {
                throw new Error('LINK_ALREADY_EXISTS');
            }
            return true;
        }),
    check('maxUses')
        .isInt({ min: 1 })
        .withMessage('MUST_BE_INTEGER')
        .custom((value: number, { req }) => {
            const championshipConfiguration: any = (req as any).championshipConfiguration;

            if (value > championshipConfiguration.maxTeams) {
                throw new Error('MUST_NOT_BE_GREATER_THAN_CHAMPIONSHIP_MAX_TEAMS');
            }
            return true;
        }),
    validateInvitationLinkExpiresAt,
    validate,
];


export const validateUseInvitationLink = [
    check('code')
        .notEmpty()
        .withMessage('MUST_NOT_BE_EMPTY')
        .isString()
        .withMessage('MUST_BE_STRING'),

    validate,
];

export const validateCheckInvitation = [
    param('code')
        .notEmpty()
        .withMessage('MUST_NOT_BE_EMPTY')
        .isString()
        .withMessage('MUST_BE_STRING'),

    validate,
];

export const validateInvitationLink = [
    ...paramsValidator('championshipId', true),
    validate
]
