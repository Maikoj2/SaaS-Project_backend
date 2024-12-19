import { Request, Response } from 'express';
import { ChampionshipService } from '../../services/championship/championship.service';
import { ApiResponse } from '../../responses/apiResponse';
import { Logger } from '../../config';
import { IUserCustomRequest } from '../../interfaces/ICustomrequest';
import { Injectable } from '@decorators/di';
import { ConfigurationService } from '../../services/championship/configuration.service';
import { Types } from 'mongoose';
import { AuthError } from '../../errors/AuthError';

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

    public create = async (req: IUserCustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            
            const { 
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
            console.log(req.body);
            const championship = await this.championshipService.create(tenant, {
                name,
                description,
                startDate,
                endDate,
                status: 'draft',
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
                'registration'
            );




            res.status(201).json({
                championship: updatedChampionship,
                configuration
            });
        } catch (error) {
            this.logger.error('Error creating championship:', error);
            res.status(500).json(
                ApiResponse.error('Error creating championship')
            );
        }
    }
    
    public registerTeam = async (req: Request, res: Response) => {
        try {
            const { championshipId, teamId } = req.params;
            const championship = await this.championshipService.registerTeam(championshipId, teamId);
            res.status(200).json(
                ApiResponse.success(championship, 'Team registered successfully')
            );
        } catch (error) {
            this.logger.error('Error registering team:', error);
            res.status(500).json(
                ApiResponse.error('Error registering team')
            );
        }
    }

    public getActive = async (req: IUserCustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const championships = await this.championshipService.getActive(tenant);
            res.status(200).json(
                ApiResponse.success(championships, 'Active championships retrieved successfully')
            );
        } catch (error) {
            this.logger.error('Error getting active championships:', error);
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : error instanceof Error ? error.message : 'Error getting active championships'));
        }
    }



    // async getAll(req: Request, res: Response) {
    //     try {
    //         const championships = await this.championshipService.getAll();
    //         res.status(200).json(
    //             ApiResponse.success(championships, 'All championships retrieved successfully')
    //         );
    //     } catch (error) {
    //         this.logger.error('Error getting all championships:', error);
    //         res.status(500).json(
    //             ApiResponse.error('Error getting all championships')
    //         );
    //     }
    // }

    // ... más métodos del controlador
}