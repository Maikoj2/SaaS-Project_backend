import { Types } from 'mongoose';
import { Logger } from '../../config';
import { AuthError, CustomError } from '../../errors';
import GameFormat, {
    IGameFormatDocument,
} from '../../models/mongoose/championship/gameFormat';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import Match from '../../models/mongoose/championship/match';
import { DatabaseHelper } from '../../utils/database.helper';
import { PaginationOptions } from '../../interfaces';

interface CreateGameFormatDTO {
    formatType: 'single_set' | 'best_of_3' | 'best_of_2' | 'custom';
    description?: string;
    sets: number;
    pointsPerSet: number;
    tiebreakerPoints?: number | null;
    maxPointsPerSet?: number | null;
    minAdvantage: number;
    customRules?: string;
}

interface UpdateGameFormatDTO {
    description?: string;
    sets?: number;
    pointsPerSet?: number;
    tiebreakerPoints?: number | null;
    maxPointsPerSet?: number | null;
    minAdvantage?: number;
    customRules?: string;
}

interface GameFormatFilters {
    formatType?: string;
}

interface AssignGameFormatDTO {
    gameFormatId: string;
}

export class GameFormatService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    async createGameFormat(
        tenant: string,
        data: CreateGameFormatDTO
    ): Promise<IGameFormatDocument> {
        this.validateCreateGameFormatPayload(data);

        const existingFormat = await DatabaseHelper.findOne(
            GameFormat,
            tenant,
            {
                formatType: data.formatType,
                sets: data.sets,
                pointsPerSet: data.pointsPerSet,
                tiebreakerPoints: data.tiebreakerPoints ?? null,
                maxPointsPerSet: data.maxPointsPerSet ?? null,
                minAdvantage: data.minAdvantage,
            }
        );

        if (existingFormat) {
            throw new CustomError(
                'A game format with these rules already exists',
                400,
                'GameFormatServiceError'
            );
        }

        const gameFormat = await DatabaseHelper.create(
            GameFormat,
            tenant,
            {
                formatType: data.formatType,
                description: data.description || '',
                sets: data.sets,
                pointsPerSet: data.pointsPerSet,
                tiebreakerPoints: data.tiebreakerPoints ?? undefined,
                maxPointsPerSet: data.maxPointsPerSet ?? undefined,
                minAdvantage: data.minAdvantage,
                customRules: data.customRules || '',
            }
        );

        if (!gameFormat) {
            throw new AuthError('Error creating game format');
        }

        return gameFormat;
    }

    async getGameFormats(
        tenant: string,
        filters: GameFormatFilters = {},
        options?: Partial<PaginationOptions>
    ) {
        const query: Record<string, any> = {};

        if (filters.formatType) {
            query.formatType = filters.formatType;
        }

        return DatabaseHelper.getItemsWithRelations(
            GameFormat,
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

    async getGameFormatById(
        tenant: string,
        gameFormatId: string
    ): Promise<IGameFormatDocument> {
        if (!Types.ObjectId.isValid(gameFormatId)) {
            throw new CustomError(
                'Invalid gameFormatId',
                400,
                'GameFormatServiceError'
            );
        }

        const gameFormat = await DatabaseHelper.findOne(
            GameFormat,
            tenant,
            {
                _id: new Types.ObjectId(gameFormatId),
            }
        );

        if (!gameFormat) {
            throw new CustomError(
                'Game format not found',
                404,
                'GameFormatServiceError'
            );
        }

        return gameFormat;
    }

    async updateGameFormat(
        tenant: string,
        gameFormatId: string,
        data: UpdateGameFormatDTO
    ): Promise<IGameFormatDocument> {
        const gameFormat = await this.getGameFormatById(
            tenant,
            gameFormatId
        );

        await this.ensureGameFormatIsNotUsedByMatches(
            tenant,
            gameFormatId
        );

        const updatedGameFormat = await DatabaseHelper.findOneAndUpdate(
            GameFormat,
            tenant,
            {
                _id: gameFormat._id,
            },
            {
                $set: data,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedGameFormat) {
            throw new AuthError('Error updating game format');
        }

        return updatedGameFormat;
    }

    async deleteGameFormat(
        tenant: string,
        gameFormatId: string
    ): Promise<IGameFormatDocument> {
        const gameFormat = await this.getGameFormatById(
            tenant,
            gameFormatId
        );

        await this.ensureGameFormatIsNotUsedByMatches(
            tenant,
            gameFormatId
        );

        const configurationUsingFormat = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                gameFormatId: gameFormat._id,
            }
        );

        if (configurationUsingFormat) {
            throw new CustomError(
                'Game format is assigned to a championship configuration and cannot be deleted',
                400,
                'GameFormatServiceError'
            );
        }

        await DatabaseHelper.delete(GameFormat, gameFormat._id.toString(), tenant);

        return gameFormat;
    }

    async assignGameFormatToChampionshipConfiguration(
        tenant: string,
        championshipId: string,
        data: AssignGameFormatDTO
    ) {
        if (!Types.ObjectId.isValid(championshipId)) {
            throw new CustomError(
                'Invalid championshipId',
                400,
                'GameFormatServiceError'
            );
        }

        if (!Types.ObjectId.isValid(data.gameFormatId)) {
            throw new CustomError(
                'Invalid gameFormatId',
                400,
                'GameFormatServiceError'
            );
        }

        await this.ensureChampionshipHasNoMatches(
            tenant,
            championshipId
        );

        const gameFormat = await this.getGameFormatById(
            tenant,
            data.gameFormatId
        );

        const configuration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        if (!configuration) {
            throw new CustomError(
                'Championship configuration not found',
                404,
                'GameFormatServiceError'
            );
        }

        const updatedConfiguration = await DatabaseHelper.findOneAndUpdate(
            ChampionshipConfiguration,
            tenant,
            {
                _id: configuration._id,
            },
            {
                $set: {
                    gameFormatId: gameFormat._id,
                    gameFormat: gameFormat.formatType,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedConfiguration) {
            throw new AuthError(
                'Error assigning game format to championship configuration'
            );
        }

        return {
            configuration: updatedConfiguration,
            gameFormat,
        };
    }

    private async ensureGameFormatIsNotUsedByMatches(
        tenant: string,
        gameFormatId: string
    ): Promise<void> {
        const matchesCount = await DatabaseHelper.count(
            Match,
            tenant,
            {
                gameFormatId: new Types.ObjectId(gameFormatId),
                status: {
                    $in: ['scheduled', 'in_progress', 'completed'],
                },
            }
        );

        if (matchesCount > 0) {
            throw new CustomError(
                'Game format cannot be changed because it is already used by matches',
                400,
                'GameFormatServiceError'
            );
        }
    }

    private async ensureChampionshipHasNoMatches(
        tenant: string,
        championshipId: string
    ): Promise<void> {
        const matchesCount = await DatabaseHelper.count(
            Match,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: {
                    $in: ['scheduled', 'in_progress', 'completed'],
                },
            }
        );

        if (matchesCount > 0) {
            throw new CustomError(
                'Game format cannot be changed because the championship already has matches created',
                400,
                'GameFormatServiceError'
            );
        }
    }

    private validateCreateGameFormatPayload(data: CreateGameFormatDTO): void {
        const allowedFormatTypes = [
            'single_set',
            'best_of_3',
            'best_of_2',
            'custom',
        ];

        if (!data.formatType) {
            throw new CustomError(
                'formatType is required',
                400,
                'GameFormatServiceError'
            );
        }

        if (!allowedFormatTypes.includes(data.formatType)) {
            throw new CustomError(
                'Invalid formatType',
                400,
                'GameFormatServiceError'
            );
        }

        if (!data.sets || data.sets <= 0) {
            throw new CustomError(
                'sets must be greater than zero',
                400,
                'GameFormatServiceError'
            );
        }

        if (!data.pointsPerSet || data.pointsPerSet <= 0) {
            throw new CustomError(
                'pointsPerSet must be greater than zero',
                400,
                'GameFormatServiceError'
            );
        }

        if (!data.minAdvantage || data.minAdvantage < 1) {
            throw new CustomError(
                'minAdvantage must be greater than zero',
                400,
                'GameFormatServiceError'
            );
        }

        if (
            data.formatType === 'single_set' &&
            data.sets !== 1
        ) {
            throw new CustomError(
                'single_set format must have exactly 1 set',
                400,
                'GameFormatServiceError'
            );
        }

        if (
            data.formatType === 'best_of_3' &&
            data.sets !== 3
        ) {
            throw new CustomError(
                'best_of_3 format must have exactly 3 sets',
                400,
                'GameFormatServiceError'
            );
        }

        if (
            data.formatType === 'best_of_2' &&
            data.sets !== 2
        ) {
            throw new CustomError(
                'best_of_2 format must have exactly 2 sets',
                400,
                'GameFormatServiceError'
            );
        }

        if (
            data.tiebreakerPoints !== undefined &&
            data.tiebreakerPoints !== null &&
            data.tiebreakerPoints <= 0
        ) {
            throw new CustomError(
                'tiebreakerPoints must be greater than zero',
                400,
                'GameFormatServiceError'
            );
        }

        if (
            data.maxPointsPerSet !== undefined &&
            data.maxPointsPerSet !== null &&
            data.maxPointsPerSet < data.pointsPerSet
        ) {
            throw new CustomError(
                'maxPointsPerSet cannot be lower than pointsPerSet',
                400,
                'GameFormatServiceError'
            );
        }
    }
}