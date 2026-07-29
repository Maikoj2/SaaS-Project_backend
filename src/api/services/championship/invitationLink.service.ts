import { nanoid } from 'nanoid';
import { InvitationLink } from '../../models/mongoose/championship/invitationLink';
import { DatabaseHelper } from '../../utils/database.helper';
import { env } from '../../config/env.config';
import { Logger } from '../../config';
import { PaginationOptions } from '../../interfaces';
import Championship from '../../models/mongoose/championship/championship';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import {
    ChampionshipStatus,
    ChampionshipStatusValue,
} from '../../constants/championship.constants';

const logger = new Logger()
const REGISTRATION_CHAMPIONSHIP_STATUS: ChampionshipStatusValue =
    ChampionshipStatus[1];
const MAX_CODE_GENERATION_ATTEMPTS = 3;

interface MongoDuplicateKeyError {
    code?: number;
    keyPattern?: Record<string, unknown>;
    keyValue?: Record<string, unknown>;
}

function isInvitationCodeCollision(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const duplicateError = error as MongoDuplicateKeyError;
    if (duplicateError.code !== 11000) {
        return false;
    }

    const duplicateFields = {
        ...duplicateError.keyPattern,
        ...duplicateError.keyValue,
    };

    return (
        Object.keys(duplicateFields).length === 0 ||
        Object.prototype.hasOwnProperty.call(duplicateFields, 'code')
    );
}

export function buildInvitationUrl(tenant: string, code: string): string {
    const tenantOrigin = env.FRONTEND_URL_TENANT.replace(
        /__TENANT__/gi,
        tenant
    ).replace(/\/+$/, '');

    return `${tenantOrigin}/register/${encodeURIComponent(code)}`;
}

export class InvitationLinkService {
    async generateLink(tenant: string, championshipId: any, maxUses: number, expiresAt: Date) {

        try {
            const configuration = await DatabaseHelper.findOne(
                ChampionshipConfiguration,
                tenant,
                { championshipId }
            );

            if (!configuration) {
                throw new Error('Championship configuration not found');
            }

            const championship = await DatabaseHelper.findOne(
                Championship,
                tenant,
                { _id: championshipId }
            );

            if (!championship) {
                throw new Error('Championship not found');
            }

            if (championship.status !== REGISTRATION_CHAMPIONSHIP_STATUS) {
                throw new Error(
                    'Championship is not accepting invitation registrations'
                );
            }

            if (
                !Number.isInteger(maxUses) ||
                maxUses < 1 ||
                maxUses > configuration.maxTeams
            ) {
                throw new Error(
                    `maxUses must be an integer between 1 and ${configuration.maxTeams}`
                );
            }

            const expiresAtTime = expiresAt?.getTime();
            const registrationDeadlineTime =
                configuration.registrationDeadline?.getTime();

            if (
                !Number.isFinite(expiresAtTime) ||
                !Number.isFinite(registrationDeadlineTime) ||
                expiresAtTime <= Date.now() ||
                expiresAtTime > registrationDeadlineTime
            ) {
                throw new Error(
                    'expiresAt must be after now and on or before the registration deadline'
                );
            }

            const usableLink = await this.findUsableLink(
                tenant,
                championshipId
            );

            if (usableLink) {
                throw new Error(
                    'A usable invitation link already exists for this championship'
                );
            }

            let code = '';
            let invitationLink;

            for (
                let attempt = 1;
                attempt <= MAX_CODE_GENERATION_ATTEMPTS;
                attempt += 1
            ) {
                code = nanoid(10);

                try {
                    invitationLink = await DatabaseHelper.create(
                        InvitationLink,
                        tenant,
                        {
                            championshipId,
                            code,
                            maxUses,
                            expiresAt,
                            isActive: true,
                            usedCount: 0
                        }
                    );
                    break;
                } catch (error: unknown) {
                    if (
                        !isInvitationCodeCollision(error) ||
                        attempt === MAX_CODE_GENERATION_ATTEMPTS
                    ) {
                        throw error;
                    }
                }
            }

            if (!invitationLink) {
                throw new Error('Unable to create a unique invitation code');
            }

            return {
                invitationLink: buildInvitationUrl(tenant, code),
                expiresAt: invitationLink.expiresAt,
                code: code
            };
        } catch (error: any) {
            logger.debug('Error detallado:', {
                error: error.message,
                championshipId,
                tenant,
                maxUses,
                expiresAt
            });
            throw new Error(`Error creating championship: ${error.message}`);
        }
    }

    async findActiveLink(tenant: string, championshipId: string) {
        return await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            {
                championshipId,
                isActive: true
            }
        );
    }

    async findUsableLink(tenant: string, championshipId: string) {
        const now = new Date();
        const link = await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            {
                championshipId,
                isActive: true,
                expiresAt: { $gt: now },
                $expr: { $lt: ['$usedCount', '$maxUses'] },
            }
        );

        if (
            !link ||
            !link.isActive ||
            link.expiresAt.getTime() <= now.getTime() ||
            link.usedCount >= link.maxUses
        ) {
            return null;
        }

        return link;
    }

    async validateAndUpdateUsage(tenant: string, code: string) {
        const link = await DatabaseHelper.findOneAndUpdate(
            InvitationLink,
            tenant,
            {
                code,
                isActive: true,
                expiresAt: { $gt: new Date() },
                $expr: { $lt: ['$usedCount', '$maxUses'] },
            },
            { $inc: { usedCount: 1 } },
            { new: true }
        );

        if (!link) {
            // Distinguir expirado vs agotado para mensaje claro
            const existing = await DatabaseHelper.findOne(
                InvitationLink,
                tenant,
                { code }
            );
            if (!existing) {
                throw new Error('the link is not valid or expired');
            }
            if (existing.expiresAt < new Date()) {
                throw new Error('The invitation link has expired');
            }
            if (existing.usedCount >= existing.maxUses) {
                throw new Error('The link has reached the maximum number of uses allowed');
            }
            throw new Error('The invitation link is no longer active');
        }

        return {
            championshipId: link.championshipId,
            maxUses: link.maxUses,
            usedCount: link.usedCount,
            expiresAt: link.expiresAt
        };
    }

    async deactivateLink(tenant: string, championshipId: string) {
        return await DatabaseHelper.findOneAndUpdate(
            InvitationLink,
            tenant,
            { championshipId, isActive: true },
            { isActive: false }
        );
    }

    async getLinkStats(tenant: string, championshipId: string) {
        const link = await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            { championshipId, isActive: true }
        );

        if (!link) return null;

        return {
            usedCount: link.usedCount,
            maxUses: link.maxUses,
            remainingUses: link.maxUses - link.usedCount,
            expiresAt: link.expiresAt,
            isActive: link.isActive,
            code: link.code
        };
    }

    async getAllLinks(
        tenant: string,
        paginationOptions: PaginationOptions,
    ) {
        return await DatabaseHelper.getItemsWithRelations(
            InvitationLink,
            tenant,
            {},
            { ...paginationOptions, select: ['championshipId', 'expiresAt', 'maxUses', 'usedCount', 'isActive', 'code'] },
            {
                nested: [{
                    path: 'championshipId',
                    select: 'name'
                }],
            }
        );
    }
}
