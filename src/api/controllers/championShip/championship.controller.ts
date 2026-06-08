import { Request, Response } from 'express';
import { ChampionshipService } from '../../services/championship/championship.service';
import { ApiResponse } from '../../responses/apiResponse';
import { Logger } from '../../config';
import { IUserCustomRequest } from '../../interfaces/ICustomrequest';
import { Injectable } from '@decorators/di';
import { ConfigurationService } from '../../services/championship/configuration.service';
import { Types } from 'mongoose';
import { AuthError } from '../../errors/AuthError';
import Championship, { IChampionshipDocument } from '../../models/mongoose/championship/championship';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration, { IConfigurationDocument } from '../../models/mongoose/championship/configuration';

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
        const tenant = req.clientAccount as string;
        if (!tenant) {
            throw new Error('Tenant not found');
        }
        let configuration: IConfigurationDocument | undefined;
        let championship: IChampionshipDocument | undefined;
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

        try {
            // create championship
            championship = await this.championshipService.create(tenant, {
                name,
                description,
                startDate,
                endDate,
                status: 'draft',
                idCreatorChampionship: req.user?._id as any
            });


            // create configuration
            configuration = await this.configurationService.create(tenant, {
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


            // update championship status
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
            this.logger.error('Error creating championship, initialing rollback', error);
            if (configuration)
                await DatabaseHelper.delete(ChampionshipConfiguration, configuration._id.toString(), tenant, { throwError: false });

            if (championship)
                await DatabaseHelper.delete(Championship, championship._id.toString(), tenant, { throwError: false });

            res.status(500).json(
                ApiResponse.error(error instanceof Error ? error.message : 'Error creating championship, ')
            );
        }
    }

    public registerTeam = async (req: IUserCustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new Error('Tenant not found');
            }
            const { championshipId, teamId } = req.params;
            const championship = await this.championshipService.registerTeam(championshipId, teamId, tenant);
            res.status(200).json(
                ApiResponse.success(championship, 'Team registered successfully')
            );
        } catch (error) {
            this.logger.error('Error registering team:', error);
            res.status(400).json(
                ApiResponse.error(error instanceof Error ? error.message : 'Error registering team')
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