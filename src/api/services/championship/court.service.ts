import { Types } from 'mongoose';
import { Logger } from '../../config';
import { AuthError, CustomError } from '../../errors';
import Court, { ICourtDocument } from '../../models/mongoose/championship/court';
import Championship from '../../models/mongoose/championship/championship';
import { DatabaseHelper } from '../../utils/database.helper';
import { PaginationOptions } from '../../interfaces';
import { validateCourtsCanBeChangedForChampionship } from '../../domain/championship/courts/courtAssignment.validator';

interface CreateCourtDTO {
    name: string;
    type: 'indoor' | 'beach';
    status?: 'available' | 'reserved' | 'occupied' | 'maintenance';
    capacity: number;
    location?: string;
    dimensions?: string;
    surface?: string;
    amenities?: string[];
}

interface UpdateCourtDTO {
    name?: string;
    type?: 'indoor' | 'beach';
    status?: 'available' | 'reserved' | 'occupied' | 'maintenance';
    capacity?: number;
    location?: string;
    dimensions?: string;
    surface?: string;
    amenities?: string[];
}

interface CourtFilters {
    status?: string;
    type?: string;
    currentChampionshipId?: string;
}

interface AttachCourtsDTO {
    courtIds: string[];
}

interface DetachCourtsDTO {
    courtIds: string[];
}

export class CourtService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    async createCourt(
        tenant: string,
        data: CreateCourtDTO
    ): Promise<ICourtDocument> {
        this.validateCreateCourtPayload(data);

        const existingCourt = await DatabaseHelper.findOne(
            Court,
            tenant,
            {
                name: data.name,
            }
        );

        if (existingCourt) {
            throw new CustomError(
                'A court with this name already exists',
                400,
                'CourtServiceError'
            );
        }

        const courtData = {
            name: data.name,
            type: data.type,
            status: data.status || 'available',
            capacity: data.capacity,
            location: data.location,
            dimensions: data.dimensions,
            surface: data.surface,
            amenities: data.amenities || [],
            maintenanceHistory: [],
            currentChampionshipId: undefined,
        };

        const court = await DatabaseHelper.create(
            Court,
            tenant,
            courtData
        );

        if (!court) {
            throw new AuthError('Error creating court');
        }

        return court;
    }

    async getCourts(
        tenant: string,
        filters: CourtFilters = {},
        options?: Partial<PaginationOptions>
    ) {
        const query: Record<string, any> = {};

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.currentChampionshipId) {
            if (!Types.ObjectId.isValid(filters.currentChampionshipId)) {
                throw new CustomError(
                    'Invalid currentChampionshipId',
                    400,
                    'CourtServiceError'
                );
            }

            query.currentChampionshipId = new Types.ObjectId(
                filters.currentChampionshipId
            );
        }

        return DatabaseHelper.getItemsWithRelations(
            Court,
            tenant,
            query,
            {
                page: options?.page || 1,
                limit: options?.limit || 20,
                sort: options?.sort || { createdAt: -1 },
            },
            {}
        );
    }

    async getCourtById(
        tenant: string,
        courtId: string
    ): Promise<ICourtDocument> {
        if (!Types.ObjectId.isValid(courtId)) {
            throw new CustomError(
                'Invalid courtId',
                400,
                'CourtServiceError'
            );
        }

        const court = await DatabaseHelper.findOne(
            Court,
            tenant,
            {
                _id: new Types.ObjectId(courtId),
            }
        );

        if (!court) {
            throw new CustomError(
                'Court not found',
                404,
                'CourtServiceError'
            );
        }

        return court;
    }

    async getAvailableCourts(
        tenant: string,
        options?: Partial<PaginationOptions>
    ) {
        return DatabaseHelper.getItemsWithRelations(
            Court,
            tenant,
            {
                status: 'available',
                currentChampionshipId: {
                    $exists: false,
                },
            },
            {
                page: options?.page || 1,
                limit: options?.limit || 20,
                sort: options?.sort || { name: 1 },
            },
            {}
        );
    }

    async updateCourt(
        tenant: string,
        courtId: string,
        data: UpdateCourtDTO
    ): Promise<ICourtDocument> {
        if (!Types.ObjectId.isValid(courtId)) {
            throw new CustomError(
                'Invalid courtId',
                400,
                'CourtServiceError'
            );
        }

        const court = await this.getCourtById(tenant, courtId);

        if (data.name && data.name !== court.name) {
            const duplicatedCourt = await DatabaseHelper.findOne(
                Court,
                tenant,
                {
                    name: data.name,
                    _id: {
                        $ne: court._id,
                    },
                }
            );

            if (duplicatedCourt) {
                throw new CustomError(
                    'A court with this name already exists',
                    400,
                    'CourtServiceError'
                );
            }
        }

        /**
         * Evitamos liberar una cancha reservada/ocupada cambiando el status
         * directamente desde updateCourt. Para eso usamos detachCourtsFromChampionship.
         */
        if (
            data.status === 'available' &&
            court.currentChampionshipId
        ) {
            throw new CustomError(
                'Court is assigned to a championship. Detach it before setting it as available',
                400,
                'CourtServiceError'
            );
        }

        const updatedCourt = await DatabaseHelper.findOneAndUpdate(
            Court,
            tenant,
            {
                _id: court._id,
            },
            {
                $set: data,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedCourt) {
            throw new AuthError('Error updating court');
        }

        return updatedCourt;
    }

    async deleteCourt(
        tenant: string,
        courtId: string
    ): Promise<ICourtDocument> {
        if (!Types.ObjectId.isValid(courtId)) {
            throw new CustomError(
                'Invalid courtId',
                400,
                'CourtServiceError'
            );
        }

        const court = await this.getCourtById(tenant, courtId);

        if (
            court.status === 'reserved' ||
            court.status === 'occupied' ||
            court.currentChampionshipId
        ) {
            throw new CustomError(
                'Court is assigned to a championship and cannot be deleted',
                400,
                'CourtServiceError'
            );
        }
        await DatabaseHelper.delete(Court, court._id.toString(), tenant, { throwError: false });
        return court;
    }

    async attachCourtsToChampionship(
        tenant: string,
        championshipId: string,
        data: AttachCourtsDTO
    ) {
        await validateCourtsCanBeChangedForChampionship(
            tenant,
            championshipId
        );

        if (!data.courtIds || !Array.isArray(data.courtIds) || !data.courtIds.length) {
            throw new CustomError(
                'courtIds is required',
                400,
                'CourtServiceError'
            );
        }

        const uniqueCourtIds = [...new Set(data.courtIds)];

        if (uniqueCourtIds.length !== data.courtIds.length) {
            throw new CustomError(
                'Duplicated courtIds are not allowed',
                400,
                'CourtServiceError'
            );
        }

        const invalidCourtId = uniqueCourtIds.find(
            (courtId) => !Types.ObjectId.isValid(courtId)
        );

        if (invalidCourtId) {
            throw new CustomError(
                `Invalid courtId: ${invalidCourtId}`,
                400,
                'CourtServiceError'
            );
        }

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
                'CourtServiceError'
            );
        }

        const courtObjectIds = uniqueCourtIds.map(
            (courtId) => new Types.ObjectId(courtId)
        );

        const courts = await Court.byTenant(tenant).find({
            _id: {
                $in: courtObjectIds,
            },
        });

        if (courts.length !== courtObjectIds.length) {
            throw new CustomError(
                'Some courts were not found',
                404,
                'CourtServiceError'
            );
        }

        const unavailableCourts = courts.filter(
            (court: any) =>
                court.status !== 'available' ||
                court.currentChampionshipId
        );

        if (unavailableCourts.length > 0) {
            throw new CustomError(
                'Some courts are not available',
                400,
                'CourtServiceError'
            );
        }

        const updatedCourtsResult = await Court.byTenant(tenant).updateMany(
            {
                _id: {
                    $in: courtObjectIds,
                },
                status: 'available',
                $or: [
                    {
                        currentChampionshipId: {
                            $exists: false,
                        },
                    },
                    {
                        currentChampionshipId: null,
                    },
                ],
            },
            {
                $set: {
                    status: 'reserved',
                    currentChampionshipId: new Types.ObjectId(championshipId),
                },
            }
        );

        if (updatedCourtsResult.modifiedCount !== courtObjectIds.length) {
            throw new CustomError(
                'Some courts could not be reserved',
                409,
                'CourtServiceError'
            );
        }

        const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
            },
            {
                $addToSet: {
                    courts: {
                        $each: courtObjectIds,
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedChampionship) {
            /**
             * Compensación simple:
             * Si actualizó las canchas pero falló el championship,
             * liberamos esas canchas para no dejarlas reservadas.
             */
            await Court.byTenant(tenant).updateMany(
                {
                    _id: {
                        $in: courtObjectIds,
                    },
                    currentChampionshipId: new Types.ObjectId(championshipId),
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

            throw new AuthError('Error attaching courts to championship');
        }

        return {
            championship: updatedChampionship,
            courtsReserved: courtObjectIds.length,
        };
    }

    async detachCourtsFromChampionship(
        tenant: string,
        championshipId: string,
        data: DetachCourtsDTO
    ) {
        await validateCourtsCanBeChangedForChampionship(
            tenant,
            championshipId
        );
        if (!data.courtIds || !Array.isArray(data.courtIds) || !data.courtIds.length) {
            throw new CustomError(
                'courtIds is required',
                400,
                'CourtServiceError'
            );
        }

        const uniqueCourtIds = [...new Set(data.courtIds)];

        const invalidCourtId = uniqueCourtIds.find(
            (courtId) => !Types.ObjectId.isValid(courtId)
        );

        if (invalidCourtId) {
            throw new CustomError(
                `Invalid courtId: ${invalidCourtId}`,
                400,
                'CourtServiceError'
            );
        }

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
                'CourtServiceError'
            );
        }

        const courtObjectIds = uniqueCourtIds.map(
            (courtId) => new Types.ObjectId(courtId)
        );

        const courts = await Court.byTenant(tenant).find({
            _id: {
                $in: courtObjectIds,
            },
            currentChampionshipId: new Types.ObjectId(championshipId),
        });

        if (courts.length !== courtObjectIds.length) {
            throw new CustomError(
                'Some courts are not assigned to this championship',
                400,
                'CourtServiceError'
            );
        }

        const occupiedCourts = courts.filter(
            (court: any) => court.status === 'occupied'
        );

        if (occupiedCourts.length > 0) {
            throw new CustomError(
                'Some courts are occupied and cannot be detached',
                400,
                'CourtServiceError'
            );
        }

        const updatedChampionship = await DatabaseHelper.findOneAndUpdate(
            Championship,
            tenant,
            {
                _id: new Types.ObjectId(championshipId),
            },
            {
                $pull: {
                    courts: {
                        $in: courtObjectIds,
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedChampionship) {
            throw new AuthError('Error detaching courts from championship');
        }

        await Court.byTenant(tenant).updateMany(
            {
                _id: {
                    $in: courtObjectIds,
                },
                currentChampionshipId: new Types.ObjectId(championshipId),
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
            championship: updatedChampionship,
            courtsReleased: courtObjectIds.length,
        };
    }

    async markCourtAsOccupied(
        tenant: string,
        courtId: string
    ): Promise<ICourtDocument> {
        const court = await this.getCourtById(tenant, courtId);

        if (court.status !== 'reserved') {
            throw new CustomError(
                'Only reserved courts can be marked as occupied',
                400,
                'CourtServiceError'
            );
        }

        const updatedCourt = await DatabaseHelper.findOneAndUpdate(
            Court,
            tenant,
            {
                _id: court._id,
            },
            {
                $set: {
                    status: 'occupied',
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedCourt) {
            throw new AuthError('Error updating court status');
        }

        return updatedCourt;
    }

    async markCourtAsReserved(
        tenant: string,
        courtId: string
    ): Promise<ICourtDocument> {
        const court = await this.getCourtById(tenant, courtId);

        if (!court.currentChampionshipId) {
            throw new CustomError(
                'Court is not assigned to a championship',
                400,
                'CourtServiceError'
            );
        }

        const updatedCourt = await DatabaseHelper.findOneAndUpdate(
            Court,
            tenant,
            {
                _id: court._id,
            },
            {
                $set: {
                    status: 'reserved',
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedCourt) {
            throw new AuthError('Error updating court status');
        }

        return updatedCourt;
    }

    private validateCreateCourtPayload(data: CreateCourtDTO): void {
        if (!data.name) {
            throw new CustomError(
                'Court name is required',
                400,
                'CourtServiceError'
            );
        }

        if (!data.type) {
            throw new CustomError(
                'Court type is required',
                400,
                'CourtServiceError'
            );
        }

        if (!['indoor', 'beach'].includes(data.type)) {
            throw new CustomError(
                'Invalid court type',
                400,
                'CourtServiceError'
            );
        }

        if (data.status && !['available', 'reserved', 'occupied', 'maintenance'].includes(data.status)) {
            throw new CustomError(
                'Invalid court status',
                400,
                'CourtServiceError'
            );
        }

        if (data.capacity === undefined || Number(data.capacity) <= 0) {
            throw new CustomError(
                'Court capacity must be greater than zero',
                400,
                'CourtServiceError'
            );
        }

        if (
            data.status === 'reserved' ||
            data.status === 'occupied'
        ) {
            throw new CustomError(
                'New courts must be created as available or maintenance',
                400,
                'CourtServiceError'
            );
        }
    }
}