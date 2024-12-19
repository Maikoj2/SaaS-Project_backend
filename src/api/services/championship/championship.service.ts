import { nanoid } from "nanoid";
import { Championship } from "../../models/mongoose/championschip/championship";
import { IChampionshipDocument } from "../../models/mongoose/championschip/championship";
import { InvitationLink } from "../../models/mongoose/championschip/invitationLink";
import { DatabaseHelper } from "../../utils/database.helper";
import { Types } from "mongoose";



type ChampionshipStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'canceled';
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
    async registerTeam(championshipId: string, teamId: string): Promise<IChampionshipDocument> {
        try {
            const championship = await Championship.findById(championshipId);
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
} 