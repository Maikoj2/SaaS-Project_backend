import { Types } from 'mongoose';

import { CustomError } from '../../errors';
import Court, { ICourtDocument } from '../../models/mongoose/championship/court';
import Championship from '../../models/mongoose/championship/championship';
import { DatabaseHelper } from '../../utils/database.helper';

interface CreateCourtDTO {
    championshipId: string;
    name: string;
    type: 'indoor' | 'beach';
    status?: 'available' | 'occupied' | 'maintenance';
    capacity: number;
    location?: string;
    dimensions?: string;
    surface?: string;
    amenities?: string[];
}

interface UpdateCourtDTO {
    name?: string;
    type?: 'indoor' | 'beach';
    status?: 'available' | 'occupied' | 'maintenance';
    capacity?: number;
    location?: string;
    dimensions?: string;
    surface?: string;
    amenities?: string[];
}

interface CourtFilters {
    championshipId?: string;
    type?: string;
    status?: string;
}

interface PaginationOptions {
    page?: number;
    limit?: number;
}

export class CourtService {
    async createCourt(
        tenant: string,
        data: CreateCourtDTO
    ): Promise<ICourtDocument> {
        if (!Types.ObjectId.isValid(data.championshipId)) {
            throw new CustomError(
                'Invalid championshipId',
                400,
                'CourtServiceError'
            );
        }

        const championship = await DatabaseHelper.findById(Championship, data.championshipId, tenant);

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'CourtServiceError'
            );
        }

        const existingCourt = await DatabaseHelper.findOne(
            Court,
            tenant,
            {
                championshipId: new Types.ObjectId(data.championshipId),
                name: data.name,
            }
        );

        if (existingCourt) {
            throw new CustomError(
                'A court with this name already exists for this championship',
                400,
                'CourtServiceError'
            );
        }

        const court = await DatabaseHelper.create(Court, tenant, {
            championshipId: new Types.ObjectId(data.championshipId),
            name: data.name,
            type: data.type,
            status: data.status || 'available',
            capacity: data.capacity,
            location: data.location,
            dimensions: data.dimensions,
            surface: data.surface,
            amenities: data.amenities || [],
            maintenanceHistory: [],
        });

        return court;
    }

    async getCourts(
        tenant: string,
        filters: CourtFilters = {},
        pagination: PaginationOptions = {}
    ): Promise<any> {
        const query: Record<string, any> = {};

        if (filters.championshipId) {
            if (!Types.ObjectId.isValid(filters.championshipId)) {
                throw new CustomError(
                    'Invalid championshipId',
                    400,
                    'CourtServiceError'
                );
            }

            query.championshipId = new Types.ObjectId(filters.championshipId);
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        const page = pagination.page || 1;
        const limit = pagination.limit || 20;

        return Court.byTenant(tenant).paginate(query, {
            page,
            limit,
            sort: { createdAt: -1 },
        });
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
                _id: courtId,
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

        const court = await DatabaseHelper.findOne(
            Court,
            tenant,
            {
                _id: courtId,
            }
        );

        if (!court) {
            throw new CustomError(
                'Court not found',
                404,
                'CourtServiceError'
            );
        }

        if (data.name && data.name !== court.name) {
            const duplicatedCourt = await Court.byTenant(tenant).findOne({
                championshipId: court.championshipId,
                name: data.name,
                _id: { $ne: court._id },
            });

            if (duplicatedCourt) {
                throw new CustomError(
                    'A court with this name already exists for this championship',
                    400,
                    'CourtServiceError'
                );
            }
        }

        const updatedCourt = await DatabaseHelper.findOneAndUpdate(
            Court,
            tenant,
            {
                _id: courtId,
            },
            {
                $set: {
                    ...data,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedCourt) {
            throw new CustomError(
                'Court could not be updated',
                500,
                'CourtServiceError'
            );
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

        const court = await DatabaseHelper.findOne(
            Court,
            tenant,
            {
                _id: courtId,
            }
        );

        if (!court) {
            throw new CustomError(
                'Court not found',
                404,
                'CourtServiceError'
            );
        }

        await DatabaseHelper.delete(Court, courtId, tenant);

        return court;
    }

    async getAvailableCourtsByChampionship(
        tenant: string,
        championshipId: string
    ): Promise<ICourtDocument[]> {
        if (!Types.ObjectId.isValid(championshipId)) {
            throw new CustomError(
                'Invalid championshipId',
                400,
                'CourtServiceError'
            );
        }

        return DatabaseHelper.find(
            Court,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: 'available',
            }
        );
    }
}