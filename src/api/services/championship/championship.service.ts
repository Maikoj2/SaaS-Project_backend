import { nanoid } from "nanoid";
import { Championship } from "../../models/mongoose/championship/championship";
import { IChampionshipDocument } from "../../models/mongoose/championship/championship";
import { InvitationLink } from "../../models/mongoose/championship/invitationLink";
import { DatabaseHelper } from "../../utils/database.helper";
import { Types } from "mongoose";
import ChampionshipConfiguration, { IConfigurationDocument } from "../../models/mongoose/championship/configuration";



type ChampionshipStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'canceled';
const selectFields = ['id', 'name', 'startDate', 'endDate', 'status', 'teams', 'courts', 'description', 'registrations', 'idCreatorChampionship'];
const selectFieldsCreator = ['name', 'email'];
const selectFieldsChampionship = ['status', 'teams'];
const selectFieldsConfiguration = ['maxTeams', 'gameFormatId', 'tieBreakerCriteria'];
const selectFieldsGameFormat = ['name', 'description'];
const selectFieldsCourts = ['name', 'description', 'status'];

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
            throw new Error(`Error creating championship: ${error.message}`);
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
                { status: newStatus as any }
            );
            if (!championship) {
                throw new Error('Championship not found');
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
                        select: 'name email ' // el -_id es opcional, si no quieres el ID
                    }]
                }
            );


            if (!populatedChampionship) {
                throw new Error('Championship not found');
            }

            return populatedChampionship;
        } catch (error: any) {
            throw new Error(`Error updating championship status: ${error.message}`);
        }
    }

    /**
     * Registrar equipo en campeonato
     */
    async registerTeam(championshipId: string, teamId: string, tenant: string): Promise<IChampionshipDocument> {
        try {
            const championship = await DatabaseHelper.findById(Championship, championshipId, tenant);
            if (!championship) {
                throw new Error('Championship not found');
            }

            // Validaciones de negocio
            if (championship.status !== 'draft') {
                throw new Error('Registration period is closed');
            }

            if (championship.registeredTeams && championship.registeredTeams.length >= championship.numberOfTeams) {
                throw new Error('Championship is full');
            }
            if (!championship.registeredTeams) {
                championship.registeredTeams = [];
            }


            championship.registeredTeams.push(teamId);
            return await championship.save();
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
    }, tenant: string): Promise<IChampionshipDocument> {
        try {
            const championship = await DatabaseHelper.findById(Championship, championshipId, tenant);
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
            championship.status = 'completed';

            return await championship.save();
        } catch (error: any) {
            throw new Error(`Error setting winners: ${error.message}`);
        }
    }

    /**
     * Obtener campeonatos activos
     */
    async getActive(tenant: string): Promise<IChampionshipDocument[]> {
        try {
            const championships = await DatabaseHelper.getItemsWithRelations(
                Championship,
                tenant,
                {
                    status: { $in: ['registration', 'in_progress'] }
                },
                {
                    page: 1,
                    limit: 100
                },
                {
                    basic: ['gameFormat', 'registeredTeams'],
                    nested: []
                }
            );
            if (!championships || !championships.items) {
                throw new Error('No championships found');
            }
            return championships.items as IChampionshipDocument[];
        } catch (error: any) {
            throw new Error(`Error getting active championships: ${error.message}`);
        }
    }

    /**
     * Obtener campeonatos paginados
     */
    async getPaginated(page: number, limit: number, tenant: string) {
        try {
            return await Championship.byTenant(tenant).paginate(
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

    /**
     * Generar enlace de invitación
     */
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
    /**
     * Obtener campeonatos por rango de fechas
     */
    async findByDateRange(startDate: Date, endDate: Date, tenant: string) {
        try {
            return await Championship.byTenant(tenant).find({
                startDate: { $gte: startDate },
                endDate: { $lte: endDate }
            });
        } catch (error: any) {
            throw new Error(`Error getting championships by date range: ${error.message}`);
        }
    }
    /**
     * Obtener campeonato por ID
     */
    async findById(id: string, tenant: string): Promise<IChampionshipDocument | null> {
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
     * Actualizar configuración del campeonato
     */
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
    /**
     * Obtener configuración del campeonato por ID
     */
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