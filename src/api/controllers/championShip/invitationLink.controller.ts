import { Response } from 'express';
import { ICustomRequest } from '../../interfaces';
import { InvitationLinkService } from '../../services/championship/invitationLink.service';
import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { CustomError } from '../../errors';


export class InvitationLinkController {
    private invitationLinkService: InvitationLinkService;
    private logger: Logger;

    constructor() {
        this.invitationLinkService = new InvitationLinkService();
        this.logger = new Logger();
    }

    public generateLink = async (req: ICustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const { maxUses, expiresAt } = req.body;
            const tenant = req.clientAccount as string;
            const expiresAtDate = new Date(expiresAt);
            console.log(expiresAtDate);
            // Verificar si ya existe un enlace activo
            const existingLink = await this.invitationLinkService.findActiveLink(tenant, championshipId);
            if (existingLink) {
                return res.status(400).json(
                    ApiResponse.error(new CustomError('already exists an active invitation link for this championship', 400, 'InvitationLinkControllerError'))
                );
            }
            const result = await this.invitationLinkService.generateLink(
                tenant,
                championshipId,
                maxUses,
                expiresAtDate
            );

            res.status(201).json(ApiResponse.success(result, 'invitation link created successfully'));
        } catch (error) {
            this.logger.error('Error creating championship:', error);
            return res.status(400).json(
                ApiResponse.error(new CustomError('error creating invitation link', 500, 'InvitationLinkControllerError'))
            );
        }
    }
    
    public useInvitationLink = async (req: ICustomRequest, res: Response) => {
        try {
            const { code } = req.body;
            const tenant = req.clientAccount as string;
    
            const championshipId = await this.invitationLinkService.validateAndUpdateUsage(tenant, code);
            
            // Continuar con el proceso de registro...
            res.status(200).json(ApiResponse.success(championshipId, 'invitation link used successfully'));
        } catch (error) {
            this.logger.error('Error using invitation link:', error);
            return res.status(400).json(
                ApiResponse.error(new CustomError('error using invitation link', 500, 'InvitationLinkControllerError'))
            );
        }
    }

    public getActiveLink = async (req: ICustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const link = await this.invitationLinkService.findActiveLink(tenant, championshipId);
            if (!link) {
                return res.status(404).json(
                    ApiResponse.error(new CustomError('there are no active invitation links', 404, 'InvitationLinkControllerError'))
                );
            }

            res.status(200).json(link);
        } catch (error) {
            this.logger.error('Error getting active link:', error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error getting invitation link', 500, 'InvitationLinkControllerError'))
            );
        }
    }

    public deactivateLink = async (req: ICustomRequest, res: Response) => {
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
                ApiResponse.error(new CustomError('Error deactivating link', 500, 'InvitationLinkControllerError'))
            );
        }
    }

    public getLinkStats = async (req: ICustomRequest, res: Response) => {
        try {
            const { id: championshipId } = req.params;
            const tenant = req.clientAccount as string;

            const stats = await this.invitationLinkService.getLinkStats(tenant, championshipId);
            res.status(200).json(stats);
        } catch (error) {
            this.logger.error('Error getting link stats:', error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error getting link stats', 500, 'InvitationLinkControllerError'))
            );
        }
    }

    public getAllLinks = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 100;

            const links = await this.invitationLinkService.getAllLinks(tenant, page, limit);
            res.status(200).json(links);
        } catch (error) {
            this.logger.error('Error getting all links:', error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error getting all links', 500, 'InvitationLinkControllerError'))
            );
        }
    }
}