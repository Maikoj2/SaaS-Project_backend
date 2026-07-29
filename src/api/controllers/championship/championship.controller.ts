import { NextFunction, Response } from 'express';
import { ChampionshipService } from '../../services/championship/championship.service';
import { ApiResponse } from '../../responses/apiResponse';
import { env, Logger } from '../../config';
import { IUserCustomRequest } from '../../interfaces/ICustomrequest';
import { Injectable } from '@decorators/di';
import { ConfigurationService } from '../../services/championship/configuration.service';

import { AuthError } from '../../errors/AuthError';
import Championship, { IChampionshipDocument } from '../../models/mongoose/championship/championship';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration, { IConfigurationDocument } from '../../models/mongoose/championship/configuration';
import { getCompetitionRulesByPreset } from '../../domain/championship/rules/competitionRules.presets';
import { CustomError } from '../../errors';
import { UploadService } from '../../services/upload/upload.service';

@Injectable()
export class ChampionshipController {
    private championshipService: ChampionshipService;
    private configurationService: ConfigurationService;
    private logger: Logger;
    private uploadService: UploadService;

    constructor() {
        this.championshipService = new ChampionshipService();
        this.configurationService = new ConfigurationService();
        this.logger = new Logger();
        this.uploadService = new UploadService();
    }

    public create = async (req: IUserCustomRequest, res: Response) => {
        const tenant = req.clientAccount as string;
        if (!tenant) {
            throw new AuthError('Tenant not found', 404);
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
            matchRules,
            customRules,
            matchDurationLimit,
            setDurationLimit,
            registrationDeadline,
            registrationFee,
            competitionRulePreset,
            distributionStrategy,
            tablePointsPolicy,
            eliminationSettings,
            logo,
            banner
        } = req.body;



        try {
            // create championship
            championship = await this.championshipService.create(tenant, {
                name,
                description,
                startDate,
                endDate,
                status: 'draft',
                logo: logo || {
                    url: env.IMAGE_NO_FOUND || null,
                    publicId: null,
                },
                banner: banner || {
                    url: env.IMAGE_NO_FOUND || null,
                    publicId: null,
                },
                idCreatorChampionship: req.user?._id as any
            });

            const competitionRules = getCompetitionRulesByPreset(
                competitionRulePreset
            );

            // create configuration
            configuration = await this.configurationService.create(tenant, {
                championshipId: championship._id as any,
                maxTeams,
                gameFormatId: gameFormatId as any,
                tieBreakerCriteria,
                matchRules,
                customRules,
                matchDurationLimit,
                setDurationLimit,
                registrationDeadline,
                registrationFee,
                competitionRulePreset,
                competitionRules,
                distributionStrategy,
                tablePointsPolicy,
                eliminationSettings
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
            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }
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
    public updateStatus = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }
            const championship = await this.championshipService.updateStatus(id, tenant, status);
            res.status(200).json(
                ApiResponse.success(championship, 'Championship updated successfully')
            );
        } catch (error: any) {
            this.logger.error(
                'Error updating championship status:',
                error
            );

            res.status(error?.statusCode ?? 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error updating championship status'
                )
            );
        }
    }

    public getById = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { championshipId } = req.params;
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }
            const championshipConfiguration = await this.configurationService.getByChampionshipId(tenant, championshipId);
            if (!championshipConfiguration) {
                return res.status(404).json(ApiResponse.error(new AuthError('Championship not found', 404)));
            }
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship retrieved successfully'));
        } catch (error) {
            this.logger.error('Error getting championship:', error);
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : error instanceof Error ? error.message : 'Error getting championship'));
        }
    }

    public softDelete = async (
        req: IUserCustomRequest,
        res: Response
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const deletedBy = req.user?._id?.toString();
            const { championshipId } = req.params;
            const { deleteReason } = req.body;

            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }

            if (!deletedBy) {
                throw new AuthError('Authenticated user not found', 401);
            }

            const championship = await this.championshipService.softDelete(
                tenant,
                championshipId,
                deletedBy,
                deleteReason
            );

            res.status(200).json(
                ApiResponse.success(
                    championship,
                    'Championship deleted successfully'
                )
            );
        } catch (error: any) {
            this.logger.error('Error deleting championship:', error);
            res.status(error?.statusCode ?? 500).json(
                ApiResponse.error(
                    error instanceof Error
                        ? error.message
                        : 'Error deleting championship'
                )
            );
        }
    }

    public updateChampionshipConfiguration = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { idConfiguration } = req.params;
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }
            const championshipConfiguration = await this.championshipService.updateConfiguration(idConfiguration, tenant, req.body);
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship configuration updated successfully'));
        } catch (error) {
            this.logger.error('Error updating championship configuration:', error);
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : error instanceof Error ? error.message : 'Error updating championship configuration'));
        }
    }

    public getChampionshipConfiguration = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { idConfiguration } = req.params;
            const tenant = req.clientAccount as string;
            if (!tenant) {
                throw new AuthError('Tenant not found', 404);
            }
            const championshipConfiguration = await this.championshipService.getConfigurationById(idConfiguration, tenant);
            res.status(200).json(ApiResponse.success(championshipConfiguration, 'Championship configuration retrieved successfully'));
        } catch (error) {
            this.logger.error('Error getting championship configuration:', error);
            res.status(error instanceof AuthError ? error.statusCode : 500)
                .json(ApiResponse.error(error instanceof AuthError ? error : error instanceof Error ? error.message : 'Error getting championship configuration'));
        }
    }


    public getAll = async (req: IUserCustomRequest, res: Response) => {
        try {
            const tenant = req.clientAccount as string;
            const championships = await this.championshipService.getAll(
                tenant,
                {

                    search:
                        typeof req.query.search === 'string'
                            ? req.query.search.trim()
                            : undefined,
                },
                {
                    page: Number(req.query.page) || 1,
                    limit: Number(req.query.limit) || 20,
                    sort: {
                        createdAt: Number(req.query.sort) as 1 | -1 || -1
                    }
                }
            );
            res.status(200).json(
                ApiResponse.success(championships, 'All championships retrieved successfully')
            );
        } catch (error) {
            this.logger.error('Error getting all championships:', error);
            res.status(500).json(
                ApiResponse.error(error instanceof CustomError ? error.message : 'Error getting all championships')
            );
        }
    };

    public uploadLogo = async (req: IUserCustomRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            if (!req.file) {
                throw new CustomError(
                    'Image file is required',
                    400,
                    'ChampionshipControllerError'
                );
            }

            const image = await this.uploadService.uploadFileToModel(Championship, championshipId, tenant, req.file, 'logo');
            res.status(200).json(
                ApiResponse.success(
                    image,
                    'Championship logo uploaded successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error uploading championship logo:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500).json(
                ApiResponse.error(error instanceof CustomError ? error.message : 'Error uploading championship logo')
            );
        }
    };

    public uploadBanner = async (
        req: IUserCustomRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> => {
        try {
            const tenant = req.clientAccount as string;
            const { championshipId } = req.params;

            if (!req.file) {
                throw new CustomError(
                    'Image file is required',
                    400,
                    'ChampionshipControllerError'
                );
            }

            const image = await this.uploadService.uploadFileToModel(Championship, championshipId, tenant, req.file, 'banner');

            res.status(200).json(
                ApiResponse.success(
                    image,
                    'Championship banner uploaded successfully'
                )
            );
        } catch (error) {
            this.logger.error('Error uploading championship banner:', error);
            res.status(error instanceof CustomError ? error.statusCode : 500).json(
                ApiResponse.error(error instanceof CustomError ? error.message : 'Error uploading championship banner')
            );
        }
    };
    // ... más métodos del controlador
}
