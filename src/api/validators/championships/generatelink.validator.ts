import { body, check, param } from 'express-validator';
import { validate } from '../../middlewares';
import Championship, { IChampionshipDocument } from '../../models/mongoose/championship/championship';
import { InvitationLinkService } from '../../services/championship/invitationLink.service';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import InvitationLink from '../../models/mongoose/championship/invitationLink';
import { IUserCustomRequest } from '../../interfaces';

const linkService = new InvitationLinkService();

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
            const link = await linkService.findActiveLink(req.clientAccount, value);
            if (link) {
                throw new Error('LINK_ALREADY_EXISTS');
            }
            return true;
        }),
    check('maxUses')
        .isInt()
        .withMessage('MUST_BE_INTEGER')
        .custom((value: number, { req }) => {
            const championshipConfiguration: any = (req as any).championshipConfiguration;

            if (value > championshipConfiguration.maxTeams) {
                throw new Error('MUST_NOT_BE_GREATER_THAN_CHAMPIONSHIP_MAX_TEAMS');
            }
            return true;
        }),
    check('expiresAt')
        .isDate()
        .isISO8601()
        .withMessage('MUST_BE_DATE')
        .custom((value: string, { req }) => {
            const expiresDate = new Date(value);

            // 1. validate date is in the future
            if (expiresDate.getTime() <= Date.now()) {
                throw new Error('MUST_BE_DATE_IN_FUTURE');
            }
            // 2. get championship from request
            const championshipConfiguration: any = (req as any).championshipConfiguration;

            if (championshipConfiguration) {
                const championshipStartDate = new Date(championshipConfiguration.championshipId.startDate);
                // 3. check that the expiration date of the link is not after the start date of the tournament
                if (expiresDate >= championshipStartDate) {
                    throw new Error('EXPIRE_DATE_AFTER_OR_EQUAL_CHAMPIONSHIP_START');
                }
            }

            return true;
        }),
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