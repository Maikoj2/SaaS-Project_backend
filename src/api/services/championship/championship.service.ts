import { nanoid } from "nanoid";
import { Championship } from "../../models/mongoose/championship/championship";
import { IChampionshipDocument } from "../../models/mongoose/championship/championship";
import { InvitationLink } from "../../models/mongoose/championship/invitationLink";
import { DatabaseHelper } from "../../utils/database.helper";
import { FilterQuery, Types } from "mongoose";
import ChampionshipConfiguration, { IConfigurationDocument } from "../../models/mongoose/championship/configuration";
import { CustomError } from "../../errors";
import Court from "../../models/mongoose/championship/court";
import { ChampionshipStatusValue } from "../../constants/championship.constants";
import { PaginationOptions } from "../../interfaces";
import { UploadService } from "../upload/upload.service";




const selectFieldsChampionship = ['status', 'teams'];

const selectFieldsGameFormat = ['name', 'description'];
const selectFieldsCourts = ['name', 'description', 'status'];

export interface UpdateChampionshipBasicInfoDTO {
    name?: string;
    description?: string;
    startDate?: Date;
    endDate?: Date;
}

export class ChampionshipService {

    private uploadService: UploadService;

    constructor() {
        this.uploadService = new UploadService();
    }
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
    async updateStatus(championshipId: string, tenant: string, newStatus: ChampionshipStatusValue): Promise<IChampionshipDocument> {
        try {
            const allowedTransitions: Record<
                ChampionshipStatusValue,
                ChampionshipStatusValue[]
            > = {
                draft: ['registration', 'cancelled'],
                registration: ['in_progress', 'cancelled'],
                in_progress: ['completed', 'cancelled'],
                completed: [],
                cancelled: [],
            };
            const currentChampionship = await DatabaseHelper.findOne(
                Championship,
                tenant,
                { _id: championshipId },
                { throwError: false }
            );

            if (!currentChampionship) {
                throw new CustomError(
                    'Championship not found',
                    404,
                    'ChampionshipServiceError'
                );
            }
            const currentStatus =
                currentChampionship.status as ChampionshipStatusValue;

            if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
                throw new CustomError(
                    `Invalid championship transition: ${currentStatus} -> ${newStatus}`,
                    409,
                    'ChampionshipServiceError'
                );
            }

            const championship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                {
                    _id: championshipId,
                    status: currentStatus,
                },
                {
                    $set: {
                        status: newStatus,
                    },
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

            if (!championship) {
                throw new CustomError(
                    'Championship status changed concurrently',
                    409,
                    'ChampionshipServiceError'
                );
            }

            return championship;
        } catch (error: any) {
            throw new Error(`Error updating championship status: ${error.message}`);
        }
    }

    async updateBasicInfo(
        tenant: string,
        championshipId: string,
        data: UpdateChampionshipBasicInfoDTO
    ): Promise<IChampionshipDocument> {
        const championship = await DatabaseHelper.findOne(
            Championship,
            tenant,
            { _id: championshipId }
        );

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'ChampionshipServiceError'
            );
        }

        const patch: UpdateChampionshipBasicInfoDTO = {};

        if (data.name !== undefined) {
            if (typeof data.name !== 'string') {
                throw new CustomError(
                    'Championship name must be a string',
                    400,
                    'ChampionshipServiceError'
                );
            }
            const name = data.name.trim();
            if (name.length < 3 || name.length > 100) {
                throw new CustomError(
                    'Championship name must contain between 3 and 100 characters',
                    400,
                    'ChampionshipServiceError'
                );
            }
            patch.name = name;
        }

        if (data.description !== undefined) {
            if (
                typeof data.description !== 'string' ||
                data.description.length > 500
            ) {
                throw new CustomError(
                    'Championship description must contain at most 500 characters',
                    400,
                    'ChampionshipServiceError'
                );
            }
            patch.description = data.description;
        }

        for (const field of ['startDate', 'endDate'] as const) {
            if (data[field] === undefined) continue;
            const value = data[field];
            if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
                throw new CustomError(
                    `${field} must be a valid date`,
                    400,
                    'ChampionshipServiceError'
                );
            }
            patch[field] = value;
        }

        const finalStartDate = patch.startDate ?? championship.startDate;
        const finalEndDate = patch.endDate ?? championship.endDate;

        if (finalStartDate.getTime() >= finalEndDate.getTime()) {
            throw new CustomError(
                'Championship startDate must be before endDate',
                400,
                'ChampionshipServiceError'
            );
        }

        if (patch.startDate) {
            const configuration = await DatabaseHelper.findOne(
                ChampionshipConfiguration,
                tenant,
                { championshipId: championship._id }
            );

            if (!configuration) {
                throw new CustomError(
                    'Championship configuration not found',
                    404,
                    'ChampionshipServiceError'
                );
            }

            if (
                configuration.registrationDeadline.getTime() >=
                finalStartDate.getTime()
            ) {
                throw new CustomError(
                    'registrationDeadline must be before Championship startDate',
                    400,
                    'ChampionshipServiceError'
                );
            }
        }

        const updatedChampionship =
            await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championship._id },
                { $set: patch },
                {
                    new: true,
                    runValidators: true,
                    select: 'name description startDate endDate status',
                }
            );

        if (!updatedChampionship) {
            throw new CustomError(
                'Championship could not be updated',
                409,
                'ChampionshipServiceError'
            );
        }

        return updatedChampionship;
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
            if (championship.status !== 'registration') {
                throw new CustomError(
                    'Registration period is closed',
                    409,
                    'ChampionshipServiceError'
                );
            }

            if (championship.registeredTeams && championship.registeredTeams.length >= championship.numberOfTeams) {
                throw new Error('Championship is full');
            }
            if (!championship.registeredTeams) {
                championship.registeredTeams = [];
            }


            const updatedChampionship = await DatabaseHelper.update(
                Championship,
                championshipId,
                tenant,
                {
                    $push: { registeredTeams: teamId }
                } as any
            );
            if (!updatedChampionship)
                throw new Error('Championship error updating ');

            return updatedChampionship
        } catch (error: any) {
            if (error instanceof CustomError) {
                throw error;
            }

            throw new CustomError(
                error instanceof Error
                    ? `Error registering team: ${error.message}`
                    : 'Error registering team',
                500,
                'ChampionshipServiceError'
            );
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
            const updatedChampionship = await DatabaseHelper.update(
                Championship,
                championshipId,
                tenant,
                {
                    winner: winners.first,
                    runnerUp: winners.second,
                    thirdPlace: winners.third,
                    status: 'completed'
                } as any
            );
            if (!updatedChampionship) {
                throw new Error('Error updating championship');
            }
            return updatedChampionship;
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
                    status: { $in: ['registration', 'in_progress', 'active'] },
                    deleted: { $ne: true }
                },
                {
                    page: 1,
                    limit: 100
                },
                {
                    // Nombres correctos de relaciones en tu esquema de Campeonato:
                    basic: ['courts'],
                    nested: []
                }
            );

            if (!championships || !championships.docs) {
                throw new Error('No championships found');
            }
            return championships.docs as IChampionshipDocument[];
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
                {
                    deleted: { $ne: true }
                },
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

    async softDelete(
        tenant: string,
        championshipId: string,
        deletedBy: string,
        deleteReason: string
    ): Promise<IChampionshipDocument> {
        const championship = await DatabaseHelper.findOne(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
                deleted: { $ne: true },
            },
            {
                throwError: false,
            }
        );

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'ChampionshipServiceError'
            );
        }

        if (['in_progress', 'completed'].includes(championship.status)) {
            throw new CustomError(
                `Championship cannot be deleted while status is ${championship.status}`,
                400,
                'ChampionshipServiceError'
            );
        }

        const allowedStatuses: ChampionshipStatusValue[] = [
            'draft',
            'registration',
            'cancelled',
        ];

        if (!allowedStatuses.includes(championship.status)) {
            throw new CustomError(
                `Championship cannot be deleted while status is ${championship.status}`,
                400,
                'ChampionshipServiceError'
            );
        }

        const deletedChampionship = await DatabaseHelper.findOneAndUpdate(
            Championship,
            tenant,
            {
                _id: championship._id,
                status: championship.status,
                deleted: { $ne: true },
            },
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: new Types.ObjectId(deletedBy),
                    deleteReason,
                    status: 'cancelled',
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );
        if (!deletedChampionship) {
            throw new CustomError(
                'Championship could not be deleted',
                409,
                'ChampionshipServiceError'
            );
        }
        const deletedChampionshipConfig = await DatabaseHelper.findOneAndUpdate(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: championship._id,
                deleted: { $ne: true },
            },
            {
                $set: {
                    deleted: true,
                    deletedAt: new Date(),
                    deletedBy: new Types.ObjectId(deletedBy),
                    deleteReason,
                    status: 'cancelled',
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!deletedChampionship) {
            throw new CustomError(
                'Championship configuration could not be deleted',
                409,
                'ChampionshipServiceError'
            );
        }

        return deletedChampionship;
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
                basic: ['idCreatorChampionship', 'courts'],
                nested: this.populateOption()
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
    async updateConfiguration(
        tenant: string,
        championshipId: string,
        championshipConfigurationId: string,
        configuration: Partial<IConfigurationDocument>
    ) {
        const championshipConfiguration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                _id: championshipConfigurationId,
                championshipId
            }
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
    async getConfigurationById(
        tenant: string,
        championshipId: string,
        championshipConfigurationId: string
    ) {
        return await DatabaseHelper.findOneWithRelations(
            ChampionshipConfiguration,
            tenant,
            {
                _id: championshipConfigurationId,
                championshipId
            },
            {
                basic: ['championshipId', 'gameFormatId'],
                nested: [
                    {
                        path: 'championshipId',
                        select: selectFieldsChampionship.join(' '),
                        populate: [
                            {
                                path: 'courts',
                                select: selectFieldsCourts.join(' ')
                            }
                        ]
                    },
                    {
                        path: 'gameFormatId',
                        select: selectFieldsGameFormat.join(' ')
                    }
                ]
            }
        );
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
                { $addToSet: { registrations: registrationId } }, // Usar $push para agregar al array
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

    /**
     * actualiza equipos luego que hacen el pago de la inscripcion
     */
    async updateTeamId(tenant: string, championshipId: string, teamId: Types.ObjectId): Promise<IChampionshipDocument> {
        try {
            const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championshipId },
                { $addToSet: { teams: teamId } }, // Usar $push para agregar al array
                { new: true } // Retornar el documento actualizado
            );

            if (!updatedChampionship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }

            return updatedChampionship;
        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error updating teams', 500, 'ChampionshipServiceError');
        }
    }

    /**
     * Eliminar registro y equipo del campeonato luego de un error al generar el enlace de pago
     */
    async deleteTeamId(tenant: string, championshipId: string, teamId: Types.ObjectId): Promise<IChampionshipDocument> {
        try {
            const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championshipId },
                { $pull: { teams: teamId } }, // Usar $pull para eliminar del array
                { new: true } // Retornar el documento actualizado
            );

            if (!updatedChampionship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }

            return updatedChampionship;
        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error deleting team', 500, 'ChampionshipServiceError');
        }
    }

    async deleteRegistrationId(tenant: string, championshipId: string, registrationId: Types.ObjectId): Promise<IChampionshipDocument> {
        try {
            const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
                Championship,
                tenant,
                { _id: championshipId },
                { $pull: { registrations: registrationId } }, // Usar $pull para eliminar del array
                { new: true } // Retornar el documento actualizado
            );

            if (!updatedChampionship) {
                throw new CustomError('Championship not found', 404, 'ChampionshipServiceError');
            }

            return updatedChampionship;
        } catch (error: any) {
            throw new CustomError(error instanceof Error ? error.message : 'Error deleting registrationId', 500, 'ChampionshipServiceError');
        }
    }

    async markAsInProgressIfNeeded(
        tenant: string,
        championshipId: string
    ): Promise<IChampionshipDocument | null> {
        const championship = await DatabaseHelper.findOne(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
            }
        );

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'ChampionshipServiceError'
            );
        }

        if (['completed', 'cancelled'].includes(championship.status)) {
            return championship;
        }

        if (championship.status === 'in_progress') {
            return championship;
        }

        return DatabaseHelper.findOneAndUpdate(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
            },
            {
                $set: {
                    status: 'in_progress',
                },
            },
            {
                new: true,
            }
        );
    }

    async completeChampionshipAndReleaseCourts(
        tenant: string,
        championshipId: string
    ): Promise<{
        championship: IChampionshipDocument | null;
        releasedCourts: number;
    }> {
        const championship = await DatabaseHelper.findOneAndUpdate(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
                status: { $ne: 'completed' },
            },
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            },
            {
                new: true,
            }
        );

        if (!championship) {
            const existing = await DatabaseHelper.findOne(
                Championship,
                tenant,
                { _id: new Types.ObjectId(championshipId) }
            );
            if (!existing) {
                throw new CustomError(
                    'Championship not found',
                    404,
                    'ChampionshipServiceError'
                );
            }
            return {
                championship: existing,
                releasedCourts: 0,
            };
        }

        const releaseResult = await Court.byTenant(tenant).updateMany(
            {
                currentChampionshipId: new Types.ObjectId(championshipId),
                status: {
                    $in: ['reserved', 'occupied'],
                },
            },
            {
                $set: {
                    status: 'available',
                },
                $unset: {
                    currentChampionshipId: '',
                },
            }
        );

        return {
            championship,
            releasedCourts:
                (releaseResult as any).modifiedCount ??
                (releaseResult as any).nModified ??
                0,
        };
    }

    async getAll(
        tenant: string,
        filters: {
            status?: string;
            search?: string;
        },
        paginationOptions: PaginationOptions
    ) {
        const query = {} as Record<string, any>;

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.search) {
            query.name = {
                $regex: filters.search,
                $options: 'i',
            };
        }

        return DatabaseHelper.getItemsWithRelations(
            ChampionshipConfiguration,
            tenant,
            {

                ...query
            },
            paginationOptions,
            {

                nested: this.populateOption(),
            }

        );
    }

    private populateOption() {
        return [
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


}
