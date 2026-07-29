import { ChampionshipConfiguration } from "../../models/mongoose/championship/configuration";

import { Championship } from "../../models/mongoose/championship/championship";
import { GameFormat } from "../../models/mongoose/championship/gameFormat";
import { IConfigurationDocument } from "../../models/mongoose/championship/configuration";
import { Logger } from "../../config";
import { DatabaseHelper } from "../../utils/database.helper";
import path from "path";

export const DEFAULT_TABLE_POINTS_POLICY = {
    winPoints: 2,
    lossPoints: 1,
    walkoverWinPoints: 2,
    walkoverLossPoints: 0
};

export const DEFAULT_ELIMINATION_SETTINGS = {
    enabled: false,
    qualificationMode: 'topPerGroup' as const,
    topPerGroup: 2,
    bestThirdsCount: 0,
    totalQualifiers: 4,
    normalizeStandingsForUnevenGroups: false,
    bracketSeedingStrategy: 'overallRanking' as const,
    bracketSize: 4 as const,
    includeThirdPlaceMatch: true,
    initialMatchNumber: 1,
    autoGenerateAfterGroupStage: false
};

export function normalizeAdvancedConfiguration(
    configData: Partial<IConfigurationDocument>
): Partial<IConfigurationDocument> {
    const eliminationSettings = {
        ...DEFAULT_ELIMINATION_SETTINGS,
        ...configData.eliminationSettings
    };

    if (eliminationSettings.qualificationMode === 'topPerGroup') {
        eliminationSettings.bestThirdsCount = 0;
    }

    return {
        ...configData,
        distributionStrategy: configData.distributionStrategy ?? 'linear',
        tablePointsPolicy: {
            ...DEFAULT_TABLE_POINTS_POLICY,
            ...configData.tablePointsPolicy
        },
        eliminationSettings
    };
}

export class ConfigurationService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    async create(tenant: string, configData: Partial<IConfigurationDocument>) {
        try {
            const normalizedConfigData = normalizeAdvancedConfiguration(configData);
            // Validar que el championshipId existe
            const championship = await DatabaseHelper.findOne(
                Championship,
                tenant,
                { _id: normalizedConfigData.championshipId },
                { throwError: true, errorMessage: 'Championship not found' }
            );
            if (!championship) {
                throw new Error('Championship not found');
            }
            if (normalizedConfigData.gameFormatId) {
                await DatabaseHelper.findOne(
                    GameFormat,
                    tenant,
                    { _id: normalizedConfigData.gameFormatId },
                    { throwError: true, errorMessage: 'Game format not found' }
                );
            }

            // Crear configuración
            const configuration = await DatabaseHelper.createWithRelations(
                ChampionshipConfiguration,
                tenant,
                {
                    ...normalizedConfigData,
                    tieBreakerCriteria: {
                        setRatio: normalizedConfigData.tieBreakerCriteria?.setRatio ?? false,
                        pointRatio: normalizedConfigData.tieBreakerCriteria?.pointRatio ?? false,
                        draw: normalizedConfigData.tieBreakerCriteria?.draw ?? false
                    }
                },
                {
                    basic: ['gameFormatId'],
                    nested: [{
                        path: 'gameFormatId',
                        select: 'description formatType -_id'  // el -_id es opcional, si no quieres el ID
                    }]
                }
            );



            this.logger.info('Configuration created:', {
                configId: configuration._id,
                championshipId: championship._id
            });

            return configuration;
        } catch (error) {
            this.logger.error('Error creating configuration:', error);
            throw error;
        }
    }

    async getByChampionshipId(tenant: string, championshipId: string) {
        try {
            return await DatabaseHelper.findOneWithRelations(
                ChampionshipConfiguration,
                tenant,
                {
                    championshipId: championshipId,
                    deleted: { $ne: true },
                },
                {
                    basic: ['championshipId'],
                    nested: [
                        {
                            path: 'championshipId',
                            select: 'name description startDate endDate status courts logo banner',
                            populate: [
                                {
                                    path: 'courts',
                                    select: 'name type status capacity location dimensions surface amenities currentChampionshipId',
                                },
                            ],
                        },
                    ]
                }

            );
        } catch (error) {
            this.logger.error('Error getting configuration:', error);
            throw error;
        }
    }

    async update(id: string, tenant: string, updateData: Partial<IConfigurationDocument>) {
        try {
            const configuration = await DatabaseHelper.update(
                ChampionshipConfiguration,
                id,
                tenant,
                updateData
            );

            if (!configuration) {
                throw new Error('Configuration not found');
            }

            return configuration;
        } catch (error) {
            this.logger.error('Error updating configuration:', error);
            throw error;
        }
    }

}
