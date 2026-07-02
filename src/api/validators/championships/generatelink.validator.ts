import { body, check, param } from 'express-validator';
import { validate } from '../../middlewares';
import Championship from '../../models/mongoose/championship/championship';
import { InvitationLinkService } from '../../services/championship/invitationLink.service';

const linkService = new InvitationLinkService();
let dateStartChampionship: Date;
export const validateGenerateInvitationLink = [
    param('id')
        .isMongoId()
        .withMessage('MUST_BE_MONGO_ID')
        .custom(async (value: string, { req }) => {
            const tenant = req.clientAccount as string;
            // search championship including tenant for security
            const championship = await Championship.byTenant(tenant).findById(value);
            if (!championship) {
                throw new Error('CHAMPIONSHIP_NOT_FOUND');
            }
            (req as any).championship = championship;
            const link = await linkService.findActiveLink(req.clientAccount, value);
            if (link) {
                throw new Error('LINK_ALREADY_EXISTS');
            }
            return true;
        }),
    check('maxUses')
        .isInt()
        .withMessage('MUST_BE_INTEGER'),
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
            const championship = (req as any).championship;

            if (championship) {
                const championshipStartDate = new Date(championship.startDate);
                // 3. check that the expiration date of the link is not after the start date of the tournament
                if (expiresDate > championshipStartDate) {
                    throw new Error('EXPIRE_DATE_AFTER_CHAMPIONSHIP_START');
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