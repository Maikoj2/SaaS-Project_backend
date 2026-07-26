import { nanoid } from 'nanoid';
import { InvitationLink } from '../../models/mongoose/championship/invitationLink';
import { DatabaseHelper } from '../../utils/database.helper';
import { env } from '../../config/env.config';
import { Logger } from '../../config';
import { PaginationOptions } from '../../interfaces';

const logger = new Logger()
export class InvitationLinkService {
    async generateLink(tenant: string, championshipId: any, maxUses: number, expiresAt: Date) {

        try {
            const code = nanoid(10);
            const invitationLink = await DatabaseHelper.create(
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

            const baseUrl = env.FRONTEND_URL || `${env.FRONTEND_URL_DEV}${env.API_PREFIX}/championships/${championshipId}`;
            return {
                invitationLink: `${baseUrl}/register?code=${code}`,
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