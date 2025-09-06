import { nanoid } from "nanoid";
import { Championship } from "../../models/mongoose/championship/championship";
import { IChampionshipDocument } from "../../models/mongoose/championship/championship";
import { InvitationLink } from "../../models/mongoose/championship/invitationLink";
import { DatabaseHelper } from "../../utils/database.helper";
import { PaginateResult, Schema, Types } from "mongoose";
import ChampionshipConfiguration, { IConfigurationDocument } from "../../models/mongoose/championship/configuration";
import { CustomError } from "../../errors";
import { ChampionshipStatus } from '../../constants/championshipStatus.constants';


export interface IChampionshipPopulated {
    _id: Schema.Types.ObjectId;
    status: string;
    teams: string[];
}

export interface PopulatedChampionship extends Omit<IConfigurationDocument, 'championshipId'> {
    championshipId: IChampionshipPopulated;
}

const selectFields = ['id', 'name', 'startDate', 'endDate', 'status', 'teams', 'courts', 'description', 'registrations', 'idCreatorChampionship'];
const selectFieldsCreator = ['name', 'email'];
const selectFieldsChampionship = ['status', 'teams'];
const selectFieldsConfiguration = ['maxTeams', 'gameFormatId', 'tieBreakerCriteria'];
const selectFieldsGameFormat = ['name', 'description'];
const selectFieldsCourts = ['name', 'description' , 'status'];
export class ChampionshipService {
    /**
     * Crear nuevo campeonato
     */
    async create(tenant: string, championshipData: Partial<IChampionshipDocument>): Promise<IChampionshipDocument> {
        try {
            const championship = await DatabaseHelper.create(
                Championship,
                tenant,
                championshipData
            );
            return championship;


        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error creating championship', 500);
        }
    }

    /**
     * Actualizar estado del campeonato
     */
    async updateStatus(championshipId: string, tenant: string, newStatus: ChampionshipStatus): Promise<IChampionshipDocument> {
        try {
            const championship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championshipId },
                { status: newStatus as any },
            );
            if (!championship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }
            // 2. Buscar con populate
            const populatedChampionship = await DatabaseHelper.findOneWithRelations(
                Championship,
                tenant,
                { _id: championship._id },
                {
                    basic: ['idCreatorChampionship'],
                    nested: [{
                        path: 'idCreatorChampionship',
                        select: selectFieldsCreator.join(' ')
                    }]
                }
            );


            if (!populatedChampionship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }

            return populatedChampionship;
        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error updating championship status', 500, 'ChampionshipServiceError');
        }
    }

    /**
     * Registrar equipo en campeonato
     */
    async registerTeam(championshipId: string, teamId: string, tenant: string): Promise<IChampionshipDocument> {
        try {
            const championship = await DatabaseHelper.findOneWithRelations(
                ChampionshipConfiguration,
                tenant,
                { championshipId: championshipId },
                {
                    basic: ['championshipId',],
                    nested: [{
                        path: 'championshipId',
                        select: selectFieldsChampionship.join(' ')
                    }]
                },
                {
                    select: selectFieldsConfiguration
                }
            ) as unknown as PopulatedChampionship;
            if (!championship) {
                throw new Error('Championship not found');
            }

            // Validaciones de negocio
            if (championship.championshipId.status !== 'draft') {
                throw new Error('Registration period is closed');
            }

            if (championship.championshipId.teams && championship.championshipId.teams.length >= championship.maxTeams) {
                throw new Error('Championship is full');
            }
            const updatedChampionship = await DatabaseHelper.update(
                Championship,
                championshipId,
                tenant,
                { $push: { teams: teamId } }
            );
            if (!updatedChampionship) {
                throw new Error('Championship not found');
            }
            return updatedChampionship;

        } catch (error: any) {
            throw new Error(`Error registering team: ${error.message}`);
        }
    }

    /**
     * Establecer ganadores del campeonato
     */
    async setWinners(championshipId: string, winners: {
        first: string;
        second: string;
        third: string;
    }): Promise<IChampionshipDocument> {
        try {
            const championship = await Championship.findById(championshipId);
            if (!championship) {
                throw new Error('Championship not found');
            }

            // Validaciones de negocio
            if (championship.status !== 'draft') {
                throw new Error('Championship must be in progress to set winners');
            }

            championship.winner = winners.first;
            championship.runnerUp = winners.second;
            championship.thirdPlace = winners.third;
            championship.status = ChampionshipStatus.COMPLETED;

            return await championship.save();
        } catch (error: any) {
            throw new Error(`Error setting winners: ${error.message}`);
        }
    }

    async findById(tenant: string, id: string): Promise<IChampionshipDocument | null> {
        const championship = await DatabaseHelper.findOneWithRelations(
            Championship,
            tenant,
            { _id: id },
            {
                basic: ['idCreatorChampionship'],
                nested: [{
                    path: 'idCreatorChampionship',
                    select: selectFieldsCreator.join(' ')
                }]
            }
        );
        if (!championship) {
            throw new Error('Championship not found');
        }
        return championship;
    }

    /**
     * Obtener campeonatos activos
     */
    async getActive(tenant: string, page: number, limit: number): Promise<PaginateResult<IChampionshipDocument>> {
        try {
            const championships = await DatabaseHelper.getItemsWithRelations(
                Championship,
                tenant,
                {
                    status: { $in: ['registration', 'in_progress'] }
                },
                {
                    page,
                    limit,
                    select: selectFields
                },
                {
                    basic: ['idCreatorChampionship'],
                    nested: [{
                        path: 'idCreatorChampionship',
                        select: selectFieldsCreator.join(' ')
                    }]
                }
            );
            if (!championships) {
                throw new Error('No championships found');
            }
            return championships
        } catch (error: any) {
            throw new Error(`Error getting active championships: ${error.message}`);
        }
    }

    /**
     * Obtener campeonatos paginados
     */
    async getPaginated(page: number, limit: number) {
        try {
            return await Championship.paginate(
                {},
                {
                    page,
                    limit,
                    sort: { startDate: -1 },
                    populate: ['gameFormat', 'registeredTeams']
                }
            );
        } catch (error: any) {
            throw new Error(`Error getting paginated championships: ${error.message}`);
        }
    }

    async generateLink(tenant: string, championshipId: string, maxUses: number, expiresAt: Date) {
        const code = nanoid(10); // genera un código único de 10 caracteres

        const invitationLink = await DatabaseHelper.create(
            InvitationLink,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId) as any,
                code,
                maxUses,
                expiresAt,
                isActive: true,
                usedCount: 0
            }
        );

        return {
            invitationLink: `${process.env.FRONTEND_URL}/register?code=${code}`,
            expiresAt: invitationLink.expiresAt
        };
    }

    async findByDateRange(startDate: Date, endDate: Date) {
        return await Championship.find({
            startDate: { $gte: startDate },
            endDate: { $lte: endDate }
        });
    }
    /**
     * Agregar un nuevo registrationId a un campeonato
     */
    async addRegistrationId(championshipId: string, tenant: string, registrationId: string): Promise<IChampionshipDocument> {
        try {
            const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championshipId },
                { $push: { registrations: registrationId } }, // Usar $push para agregar al array
                { new: true } // Retornar el documento actualizado
            );

            if (!updatedChampionship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }

            return updatedChampionship;
        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error adding registrationId', 500, 'ChampionshipServiceError');
        }
    }

    async updateConfiguration(championshipConfigurationId: string, tenant: string, configuration: Partial<IConfigurationDocument>) {
        const championshipConfiguration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            { _id: championshipConfigurationId }
        );
        if (!championshipConfiguration) {
            throw new Error('Championship configuration not found');
        }


        return await DatabaseHelper.update(
            ChampionshipConfiguration,
            championshipConfiguration._id.toString(),
            tenant,
            configuration,
            {
                new: true,              // return the updated document
                runValidators: true,    // run validators from the schema
                select: ['-_id -updatedAt -createdAt']
            }
        );
    }
    
    async getConfigurationById(championshipConfigurationId: string, tenant: string) {
        return await DatabaseHelper.findOneWithRelations(
            ChampionshipConfiguration,
            tenant,
            { _id: championshipConfigurationId },
            {
                basic: ['championshipId', 'gameFormatId', 'courts'],
                nested: [{
                    path: 'championshipId',
                    select: selectFieldsChampionship.join(' ')
                }, {
                    path: 'gameFormatId',
                    select: selectFieldsGameFormat.join(' ')
                }, {
                    path: 'courts',
                    select: selectFieldsCourts.join(' ')
                }]
            }
        );
    }
} 