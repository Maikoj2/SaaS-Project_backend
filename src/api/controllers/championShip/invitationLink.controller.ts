import { Response } from 'express';
import { IUserCustomRequest } from '../../interfaces';
import { InvitationLinkService } from '../../services/championship/invitationLink.service';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';


export class InvitationLinkController {
    private invitationLinkService: InvitationLinkService;
    private logger: Logger;

    constructor() {
        this.invitationLinkService = new InvitationLinkService();
        this.logger = new Logger();
    }

    public generateLink = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const { maxUses, expiresAt } = req.body;
            const tenant = req.clientAccount as string;

            // Verificar si ya existe un enlace activo
            const existingLink = await this.invitationLinkService.findActiveLink(tenant, championshipId);
            if (existingLink) {
                return res.status(400).json(
                    ApiResponse.error('already exists an active invitation link for this championship')
                );
            }
            const result = await this.invitationLinkService.generateLink(
                tenant,
                championshipId,
                maxUses,
                new Date(expiresAt)
            );

            res.status(201).json(result);
        } catch (error) {
            this.logger.error('Error creating championship:', error);
            return res.status(400).json(
                ApiResponse.error('error creating invitation link')
            );
        }
    }
    
    public useInvitationLink = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { code } = req.body;
            const tenant = req.clientAccount as string;
    
            const championshipId = await this.invitationLinkService.validateAndUpdateUsage(tenant, code);
            
            // Continuar con el proceso de registro...
            res.status(200).json({
                success: true,
                championshipId
            });
        } catch (error) {
            this.logger.error('Error using invitation link:', error);
            return res.status(400).json(
                ApiResponse.error('error using invitation link')
            );
        }
    }

    public getActiveLink = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const link = await this.invitationLinkService.findActiveLink(tenant, championshipId);
            if (!link) {
                return res.status(404).json(
                    ApiResponse.error('No hay enlaces de invitación activos')
                );
            }

            res.status(200).json(link);
        } catch (error) {
            this.logger.error('Error getting active link:', error);
            res.status(500).json(
                ApiResponse.error('Error al obtener el enlace de invitación')
            );
        }
    }

    public deactivateLink = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            await this.invitationLinkService.deactivateLink(tenant, championshipId);
            res.status(200).json(
                ApiResponse.success('Enlace desactivado correctamente')
            );
        } catch (error) {
            this.logger.error('Error deactivating link:', error);
            res.status(500).json(
                ApiResponse.error('Error al desactivar el enlace')
            );
        }
    }

    public getLinkStats = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const stats = await this.invitationLinkService.getLinkStats(tenant, championshipId);
            res.status(200).json(stats);
        } catch (error) {
            this.logger.error('Error getting link stats:', error);
            res.status(500).json(
                ApiResponse.error('Error al obtener estadísticas del enlace')
            );
        }
    }

    public getAllLinks = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const links = await this.invitationLinkService.getAllLinks(tenant, championshipId);
            res.status(200).json(links);
        } catch (error) {
            this.logger.error('Error getting all links:', error);
            res.status(500).json(
                ApiResponse.error('Error al obtener los enlaces')
            );
        }
    }
}