import { Request, Response } from 'express';
import { ChampionshipService } from '../../services/championship/championship.service';
import { ApiResponse } from '../../responses/apiResponse';
import { Logger } from '../../config';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { Injectable } from '@decorators/di';
import { ConfigurationService } from '../../services/championship/configuration.service';
import { Types } from 'mongoose';
import { CustomError } from '../../errors';
import { ChampionshipStatus } from '../../constants/championshipStatus.constants';

@Injectable()
export class ChampionshipController {
    private championshipService: ChampionshipService;
    private configurationService: ConfigurationService;
    private logger: Logger;

    constructor() {
        this.championshipService = new ChampionshipService();
        this.configurationService = new ConfigurationService();
        this.logger = new Logger();
    }

    public create = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            
            const { 
                type,
                name, 
                description, 
                startDate, 
                endDate,
                maxTeams,
                gameFormatId,
                tieBreakerCriteria,
                customRules,
                matchDurationLimit,
                setDurationLimit,
                registrationDeadline,
                registrationFee
            } = req.body;
            const championship = await this.championshipService.create(tenant, {
                type,
                name,
                description,
                startDate,
                endDate,
                status: ChampionshipStatus.DRAFT,
                idCreatorChampionship: req.user?._id as any 
            });
        
            const configuration = await this.configurationService.create(tenant, {
                championshipId: championship._id as any,
                maxTeams,
                gameFormatId: gameFormatId as any,
                tieBreakerCriteria,
                customRules,
                matchDurationLimit,
                setDurationLimit,
                registrationDeadline,
                registrationFee
            });
            const updatedChampionship = await this.championshipService.updateStatus(
                championship._id.toString(),
                tenant,
                ChampionshipStatus.REGISTRATION
            );




            res.status(201).json(ApiResponse.success({updatedChampionship, configuration}, 'Championship created successfully')  );
        } catch (error) {
            this.logger.error('Error creating championship:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error creating championship', 500, 'ChampionshipControllerError')));
        }
    }
    
    public registerTeam = async (req: ICustomRequest, res: Response) => {
        try {
            const { championshipId, teamId } = req.params;
            const tenant = req.clientAccount as string;
            const championship = await this.championshipService.registerTeam(championshipId, teamId, tenant);
            res.status(200).json(
                ApiResponse.success(championship, 'Team registered successfully')
            );
        } catch (error) {
            this.logger.error('Error registering team:', error);
            res.status(500).json(
                ApiResponse.error(new CustomError('Error registering team', 500, 'ChampionshipControllerError'))
            );
        }
    }

    public getActive = async (req: ICustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 100;
            const championships = await this.championshipService.getActive(tenant, page, limit);
            res.status(200).json(
                ApiResponse.success(championships, 'Active championships retrieved successfully')
            );
        } catch (error) {
            this.logger.error('Error getting active championships:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof CustomError ? error : new CustomError('Error getting active championships', 500, 'ChampionshipControllerError')));
        }
    }
    
    public getById = async (req: ICustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount as string;
            const championshipConfiguration = await this.championshipService.findById(id, tenant);
            if (!championshipConfiguration) {
                return res.status(404).json(ApiResponse.error(new CustomError('Championship not found', 404, 'ChampionshipControllerError')));
            }
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship retrieved successfully'));
        } catch (error) {
            this.logger.error('Error getting championship:', error);
            res.status(500).json(ApiResponse.error(new CustomError('Error getting championship', 500, 'ChampionshipControllerError')));
        }
    }
    public updateStatus = async (req: ICustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const tenant = req.clientAccount as string;
            const championship = await this.championshipService.updateStatus(id, tenant, status);
            res.status(200).json(championship);
        } catch (error) {
            this.logger.error('Error updating championship status:', error);
            res.status(500).json(ApiResponse.error(new CustomError('Error updating championship status', 500, 'ChampionshipControllerError')));
        }
    }

    public updateChampionshipConfiguration = async (req: ICustomRequest, res: Response) => {
        try {
            const { idConfiguration } = req.params;
            const tenant = req.clientAccount as string;
            const championshipConfiguration = await this.championshipService.updateConfiguration(idConfiguration, tenant, req.body);
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship configuration updated successfully'));
        } catch (error) {
            this.logger.error('Error updating championship configuration:', error);
            res.status(500).json(ApiResponse.error(new CustomError('Error updating championship configuration', 500, 'ChampionshipControllerError')));
        }
    }

    public getChampionshipConfiguration = async (req: ICustomRequest, res: Response) => {
        try {
            const { idConfiguration } = req.params;
            const tenant = req.clientAccount as string;
            const championshipConfiguration = await this.championshipService.getConfigurationById(idConfiguration, tenant);
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship configuration retrieved successfully'));
        } catch (error) {
            this.logger.error('Error getting championship configuration:', error);
            res.status(500).json(ApiResponse.error(new CustomError('Error getting championship configuration', 500, 'ChampionshipControllerError')));
        }
    }

    // ... más métodos del controlador
}