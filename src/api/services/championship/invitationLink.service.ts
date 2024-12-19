import { nanoid } from 'nanoid';
import { InvitationLink } from '../../models/mongoose/championschip/invitationLink';
import { DatabaseHelper } from '../../utils/database.helper';
import { env } from '../../config/env.config';

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
                expiresAt: invitationLink.expiresAt
            };
        } catch (error) {
            console.error('Error detallado:', {
                error,
                championshipId,
                tenant,
                maxUses,
                expiresAt
            });
            throw error;
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
        const invitationLink = await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            { code, isActive: true }
        );
    
        if (!invitationLink) {
            throw new Error('Enlace de invitación no válido o expirado');
        }
    
        // Validar fecha de expiración
        if (invitationLink.expiresAt < new Date()) {
            await DatabaseHelper.findOneAndUpdate(
                InvitationLink,
                tenant,
                { code },
                { isActive: false }
            );
            throw new Error('The invitation link has expired');
        }
    
        // Validar número máximo de usos
        if (invitationLink.usedCount >= invitationLink.maxUses) {
            await DatabaseHelper.findOneAndUpdate(
                InvitationLink,
                tenant,
                { code },
                { isActive: false }
            );
            throw new Error('The link has reached the maximum number of uses allowed');
        }
    
        // Incrementar el contador de usos
        await DatabaseHelper.findOneAndUpdate(
            InvitationLink,
            tenant,
            { code },
            { $inc: { usedCount: 1 } }
        );
    
        return invitationLink.championshipId;
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

    async getAllLinks(tenant: string, championshipId: string) {
        return await DatabaseHelper.getItems(
            InvitationLink,
            tenant,
            { championshipId, sort: { createdAt: -1 } }
        );
    }
}