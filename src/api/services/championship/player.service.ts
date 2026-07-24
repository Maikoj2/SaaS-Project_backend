import { DatabaseHelper } from '../../utils/database.helper';
import { Player, IPlayerDocument, IndoorVolleyballPosition, BeachVolleyballPosition, EPSProvider } from '../../models/mongoose/championship/player';
import { Logger } from '../../config/logger/WinstonLogger';
import { User } from '../../models';
import Club from '../../models/mongoose/championship/club';
import Championship, { ChampionshipType } from '../../models/mongoose/championship/championship';
import { CustomError } from '../../errors';
import { RegistrationService } from './register.service';
import { PaginationOptions } from '../../interfaces';
import { Types } from 'mongoose';
import Team from '../../models/mongoose/championship/team';
import { PopulateOptions } from '../../interfaces/IhelperDatabase';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import { PasswordUtil } from '../../utils';
import { env } from '../../config';
import { EmailService } from '../email/email.service';



export class PlayerService {
    private logger: Logger;
    private registrationService: RegistrationService;
    private emailService: EmailService;

    constructor() {
        this.logger = new Logger();
        this.registrationService = new RegistrationService();
        this.emailService = new EmailService();
    }

    public createPlayerByLink = async (tenant: string, playerData: Partial<IPlayerDocument>, code: string): Promise<IPlayerDocument> => {
        try {
            const { userId, clubId, position } = playerData;
            if (!userId) throw new Error('User ID is required')
            if (!position) throw new Error('Position is required');

            const { configuration } = await this.registrationService.validateInitialRegistration(
                tenant,
                code,
            );
            // validate if user exists
            const existingUser = await DatabaseHelper.findById(
                User,
                userId.toString(),
                tenant,
                { deleted: false });

            if (!existingUser) throw new Error('User not found');
            if (clubId) {
                const existingClub = await DatabaseHelper.findById(
                    Club,
                    clubId.toString(),
                    tenant,
                    { deleted: false });
                if (!existingClub) throw new Error('Club not found');
            } else {
                const independentClub = await DatabaseHelper.findOne(Club, tenant, { name: 'Independiente' });
                if (!independentClub) throw new Error('Independent club not found');
                playerData.clubId = independentClub._id as any;
                playerData.isIndependent = true;
            }



            // validate if player exists
            const existingPlayer = await DatabaseHelper.findOne(Player, tenant, { userId: existingUser._id });

            if (existingPlayer) throw new CustomError('Player already exists', 400, 'PlayerAlreadyExistsError');

            // validate if position is valid
            const championship = await DatabaseHelper.findById(
                Championship,
                configuration.championshipId.toString(),
                tenant,
                { deleted: false });



            if (!championship) throw new CustomError('Championship not found', 404, 'ChampionshipNotFoundError');
            this.logger.info(`Championship type: ${championship.type}, Position: ${playerData.position}`);

            const validPosition = this.validatePosition(position, championship.type);
            if (!validPosition) {
                if (championship.type === ChampionshipType.INDOOR) {
                    throw new Error('Invalid indoor volleyball position');
                }
                if (championship.type === ChampionshipType.BEACH) {
                    throw new Error('Invalid beach volleyball position');
                }
            }
            const player = await DatabaseHelper.create(
                Player,
                tenant,
                {
                    ...playerData, status: 'active',
                    isTeamMember: false,
                });

            return player;
        } catch (error) {
            this.logger.error('Error creating player:', error);
            throw error;
        }
    }

    public createPlayerManually = async (
        tenant: string,
        championshipId: string,
        data: {
            sendEmail: boolean;
            user: {
                name: string;
                lastName?: string;
                email: string;
                phone?: string;
                nie?: string;
            };
            player: {
                eps: string;
                gender: 'male' | 'female';
                dateOfBirth?: Date;
                position: string;
                number?: number;
                height?: number;
                weight?: number;
                dominantHand?: 'left' | 'right';
                nationality?: string;
                experience?: number;
                photo?: string;
            };
        }
    ) => {
        try {
            const championship = await DatabaseHelper.findOne(
                ChampionshipConfiguration,
                tenant,
                {
                    championshipId: new Types.ObjectId(championshipId)
                },
                {
                    deleted: false
                }
            );

            if (!championship) {
                throw new CustomError(
                    'Championship not found',
                    404,
                    'PlayerServiceError'
                );
            }

            const normalizedEmail = data.user.email.trim().toLowerCase();

            const existingUserByEmail = await DatabaseHelper.findOne(
                User,
                tenant,
                {
                    email: normalizedEmail,
                }
            );

            if (existingUserByEmail) {
                throw new CustomError(
                    'User email already exists',
                    400,
                    'PlayerServiceError'
                );
            }

            const normalizedNie = data.user.nie?.trim().toUpperCase();

            if (normalizedNie) {
                const existingUserByNie = await DatabaseHelper.findOne(
                    User,
                    tenant,
                    {
                        nie: normalizedNie,
                    }
                );

                if (existingUserByNie) {
                    throw new CustomError(
                        'User NIE already exists',
                        400,
                        'PlayerServiceError'
                    );
                }
            }
            const volleyballType = await this.getChampionshipType(tenant, championshipId);

            const validPosition = this.validatePosition(
                data.player.position,
                volleyballType
            );

            if (!validPosition) {
                throw new CustomError(
                    'Invalid player position for this championship type',
                    400,
                    'PlayerServiceError'
                );
            }

            const temporaryPassword = `Temp${Date.now()}!`;
            const hashedPassword = await PasswordUtil.hashPassword(
                temporaryPassword
            );

            const userPayload: Record<string, any> = {
                name: data.user.name,
                lastName: data.user.lastName,
                email: normalizedEmail,
                phone: data.user.phone,
                password: hashedPassword,
                role: 'team_member',
                verified: true,
                mustChangePassword: true,
                createFromRegistration: true,
            };

            if (normalizedNie) {
                userPayload.nie = normalizedNie;
            }

            const user = await DatabaseHelper.create(
                User,
                tenant,
                userPayload
            );

            const player = await DatabaseHelper.create(
                Player,
                tenant,
                {
                    userId: user._id,
                    eps: data.player.eps as EPSProvider,
                    gender: data.player.gender,
                    dateOfBirth: data.player.dateOfBirth,
                    position: data.player.position as (IndoorVolleyballPosition | BeachVolleyballPosition),
                    number: data.player.number,
                    height: data.player.height,
                    weight: data.player.weight,
                    dominantHand: data.player.dominantHand,
                    nationality: data.player.nationality,
                    experience: data.player.experience,
                    photo: data.player.photo,
                    status: 'active',
                    isTeamMember: false,
                }
            );
            if (data.sendEmail) {
                await this.emailService.sendTemporaryPasswordEmail({
                    email: user.email,
                    name: user.name,
                    temporaryPassword,
                    tenant,
                });
            }

            return {
                user,
                player,
                ...(env.NODE_ENV !== "production" && {
                    credentials: temporaryPassword
                })
            };
        } catch (error) {
            this.logger.error('Error creating player manually:', error);

            throw error instanceof CustomError
                ? error
                : new CustomError(
                    error instanceof Error
                        ? error.message
                        : 'Error creating player manually',
                    500,
                    'PlayerServiceError'
                );
        }
    };

    private validatePosition(position: string, championshipType: ChampionshipType): boolean {
        try {
            if (!position) {
                throw new CustomError('Position is required', 400, 'ValidationError');
            }

            if (!championshipType) {
                throw new CustomError('Championship type is required', 400, 'ValidationError');
            }

            switch (championshipType) {
                case ChampionshipType.INDOOR:
                    return Object.values(IndoorVolleyballPosition)
                        .includes(position as IndoorVolleyballPosition);

                case ChampionshipType.BEACH:
                    return Object.values(BeachVolleyballPosition)
                        .includes(position as BeachVolleyballPosition);

                default:
                    throw new CustomError(`Unsupported championship type: ${championshipType}`, 400, 'ValidationError');
            }
        } catch (error) {
            throw new CustomError(
                `Invalid position validation: ${error}`,
                400,
                'ValidationError'
            );
        }
    }

    async getPlayersByChampionship(
        tenant: string,
        championshipId: string,
        filters: {
            status?: string;
            gender?: string;
            search?: string;
        },
        options?: Partial<PaginationOptions>
    ) {
        const teams = await DatabaseHelper.find(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                select: ['players'],
            }
        );

        const playerIds = teams.flatMap((team: any) => team.players || []);

        const query: Record<string, any> = {
            _id: {
                $in: playerIds,
            },
        };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.gender) {
            query.gender = filters.gender;
        }

        if (filters.search) {
            const users = await DatabaseHelper.find(
                User,
                tenant,
                {
                    $or: [
                        {
                            name: {
                                $regex: filters.search,
                                $options: 'i',
                            },
                        },
                        {
                            lastName: {
                                $regex: filters.search,
                                $options: 'i',
                            },
                        },
                        {
                            email: {
                                $regex: filters.search,
                                $options: 'i',
                            },
                        },
                        {
                            nie: {
                                $regex: filters.search,
                                $options: 'i',
                            },
                        },
                    ],
                },
                {
                    select: ['_id'],
                }
            );

            query.userId = {
                $in: users.map((user: any) => user._id),
            };
        }

        return DatabaseHelper.getItemsWithRelations(
            Player,
            tenant,
            query,
            options,
            {
                nested: this.populateOptions,
            }
        );
    }

    async getPlayerById(
        tenant: string,
        championshipId: string,
        playerId: string
    ) {
        await this.validatePlayerBelongsToChampionship(
            tenant,
            championshipId,
            playerId
        );

        const player = await DatabaseHelper.findOneWithRelations(
            Player,
            tenant,
            {
                _id: new Types.ObjectId(playerId),
            },
            {
                nested: this.populateOptions,
            }
        );

        if (!player) {
            throw new CustomError(
                'Player not found',
                404,
                'PlayerServiceError'
            );
        }

        return player;
    }

    async updatePlayer(
        tenant: string,
        championshipId: string,
        playerId: string,
        data: {
            position?: string;
            eps?: string;
            gender?: 'male' | 'female';
            dateOfBirth?: Date;
            number?: number;
            status?: 'active' | 'inactive' | 'injured' | 'suspended';
            height?: number;
            weight?: number;
            dominantHand?: 'left' | 'right';
            nationality?: string;
            experience?: number;
            photo?: string;
        }
    ) {
        await this.validatePlayerBelongsToChampionship(
            tenant,
            championshipId,
            playerId
        );

        const updatePayload: Record<string, any> = {};



        if (data.eps !== undefined) {
            updatePayload.eps = data.eps;
        }

        if (data.gender !== undefined) {
            updatePayload.gender = data.gender;
        }

        if (data.dateOfBirth !== undefined) {
            updatePayload.dateOfBirth = data.dateOfBirth;
        }

        if (data.number !== undefined) {
            updatePayload.number = data.number;
        }

        if (data.status !== undefined) {
            updatePayload.status = data.status;
        }

        if (data.height !== undefined) {
            updatePayload.height = data.height;
        }

        if (data.weight !== undefined) {
            updatePayload.weight = data.weight;
        }

        if (data.dominantHand !== undefined) {
            updatePayload.dominantHand = data.dominantHand;
        }

        if (data.nationality !== undefined) {
            updatePayload.nationality = data.nationality;
        }

        if (data.experience !== undefined) {
            updatePayload.experience = data.experience;
        }

        if (data.photo !== undefined) {
            updatePayload.photo = data.photo;
        }

        if (data.position !== undefined) {
            const volleyballType = await this.getChampionshipType(tenant, championshipId);

            const validPosition = this.validatePosition(
                data.position,
                volleyballType
            )

            if (!validPosition) {
                throw new CustomError(
                    'Invalid player position for this championship type',
                    400,
                    'PlayerServiceError'
                );
            }
            updatePayload.position = data.position;
        }
        this.logger.info('Updating player:', {
            tenant,
            championshipId,
            playerId,
            data,
        });

        const updatedPlayer = await DatabaseHelper.findOneAndUpdate(
            Player,
            tenant,
            { _id: new Types.ObjectId(playerId) },
            { $set: updatePayload },
            {
                new: true,
                runValidators: true,
                throwError: false
            }
        );
        if (!updatedPlayer) {
            throw new CustomError(
                'Player not found',
                404,
                'PlayerServiceError'
            );
        }

        return updatedPlayer;
    }

    private async validatePlayerBelongsToChampionship(
        tenant: string,
        championshipId: string,
        playerId: string
    ): Promise<void> {
        const team = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                players: new Types.ObjectId(playerId),
            }
        );

        if (!team) {
            throw new CustomError(
                'Player does not belong to this championship',
                404,
                'PlayerServiceError'
            );
        }
    }

    private get populateOptions(): PopulateOptions[] {
        return [
            {
                path: 'userId',
                select: 'name lastName email phone nie role verified mustChangePassword',
            },
            {
                path: 'clubId',
                select: 'name logo',
            },
        ];
    }

    private async getChampionshipType(tenant: string, championshipId: string): Promise<ChampionshipType> {
        const championship = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId)
            },
            {
                deleted: false
            }
        );

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'ChampionshipNotFoundError'
            );
        }

        return championship.matchRules.volleyballType as ChampionshipType;
    }
}
