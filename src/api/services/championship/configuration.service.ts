import { ChampionshipConfiguration } from "../../models/mongoose/championschip/configuration";

import { Championship } from "../../models/mongoose/championschip/championship";
import { GameFormat } from "../../models/mongoose/championschip/gameFormat";
import { IConfigurationDocument } from "../../models/mongoose/championschip/configuration";
import { Logger } from "../../config";
import { DatabaseHelper } from "../../utils/database.helper";


export class ConfigurationService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    async create(tenant: string, configData: Partial<IConfigurationDocument>) {
        try {
            // Validar que el championshipId existe
            const championship = await DatabaseHelper.findOne(
                Championship,
                tenant,
                { _id: configData.championshipId },
                { throwError: true, errorMessage: 'Championship not found' }
            );
            if (!championship) {
                throw new Error('Championship not found');
            }
            const gameFormat = await DatabaseHelper.findOne(
                GameFormat,
                tenant,
                { _id: configData.gameFormatId },
                { throwError: true, errorMessage: 'Game format not found' }
            );

            if (!gameFormat) {
                throw new Error('Game format not found');
            }

            // Crear configuración
            const configuration = await DatabaseHelper.createWithRelations(
                ChampionshipConfiguration,
                tenant,
                {
                    ...configData,
                    tieBreakerCriteria: {
                        setRatio: configData.tieBreakerCriteria?.setRatio || false,
                        pointRatio: configData.tieBreakerCriteria?.pointRatio || false,
                        draw: configData.tieBreakerCriteria?.draw || false
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
            return await DatabaseHelper.findOne(
                ChampionshipConfiguration,
                tenant,
                { championshipId },
                { 
                    throwError: true,
                    errorMessage: 'Configuration not found for this championship'
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
                throw  new Error('Configuration not found');
            }

            return configuration;
        } catch (error) {
            this.logger.error('Error updating configuration:', error);
            throw error;
        }
    }
}