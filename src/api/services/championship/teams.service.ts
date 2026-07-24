import { Types } from "mongoose";
import Championship from "../../models/mongoose/championship/championship";
import Club from "../../models/mongoose/championship/club";
import Team, { ITeamDocument } from "../../models/mongoose/championship/team";
import { DatabaseHelper } from "../../utils/database.helper";
import { CustomError } from "../../errors";
import { Logger } from "../../config";
import Player from "../../models/mongoose/championship/player";
import { RegistrationService } from "./register.service";
import { PaginationOptions } from "../../interfaces";
import Registration from "../../models/mongoose/championship/registration";
import ChampionshipConfiguration from "../../models/mongoose/championship/configuration";
import { validateCompetitionRulesForTeam } from "../../domain/championship/rules/competitionRules.validator";
import { validateChampionshipTeamCapacity } from "../../domain/championship/rules/championshipCapacity.validator";
import Group from "../../models/mongoose/championship/group";
import Match from "../../models/mongoose/championship/match";
import GroupDistribution from "../../models/mongoose/championship/groupsDistrubution";




export class TeamService {
    private readonly registrationService: RegistrationService;
    private readonly logger: Logger;
    constructor() {
        this.registrationService = new RegistrationService();
        this.logger = new Logger();
    }

    createTeamByLink = async (tenant: string, teamData: ITeamDocument, code: string,) => {

        try {
            const { invitationLink } = await this.registrationService.validateInitialRegistration(
                tenant,
                code,
            );
            if (!invitationLink) {
                throw new CustomError('Invalid invitation code', 404, 'ValidationError');
            }

            const championship = await DatabaseHelper.findById(Championship, invitationLink.championshipId as any, tenant, { deleted: false });
            if (!championship) throw new Error('Championship not found');



            if (!teamData.clubId) {
                const club = await DatabaseHelper.findOne(Club, tenant, { name: 'Independiente' });
                if (!club) throw new Error('Independiente Club not found');
                teamData.clubId = club._id as any;
            }
            const playersIds = teamData.players || [];
            await this.validatePlayers(playersIds as any[], tenant);

            const teamDataWithHistory = {
                ...teamData,
                participationHistory: [{
                    championshipId: invitationLink.championshipId,
                    year: new Date().getFullYear(),
                    position: 0
                }],
                championshipId: invitationLink.championshipId
            };

            const team = await DatabaseHelper.create(Team, tenant, teamDataWithHistory);
            return team;
        } catch (error) {
            this.logger.error('Error creating team:', error);
            throw new CustomError(error instanceof Error ? error.message : 'Error creating team', 500, 'TeamServiceError');
        }
    }

    async getTeamsByChampionship(
        tenant: string,
        championshipId: string,
        filters: {
            status?: string;
            search?: string;
        },
        options?: Partial<PaginationOptions>
    ) {
        const query: Record<string, any> = {
            'participationHistory.championshipId': new Types.ObjectId(championshipId),
        };

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
            Team,
            tenant,
            query,
            options,
            {
                nested: this.populateOptions,
            }
        );
    }

    async getTeamById(
        tenant: string,
        championshipId: string,
        teamId: string
    ) {
        const team = await DatabaseHelper.findOneWithRelations(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                nested: this.populateOptions,
            }
        );

        if (!team) {
            throw new CustomError(
                'Team not found',
                404,
                'TeamServiceError'
            );
        }

        return team;
    }

    async createTeamManually(
        tenant: string,
        championshipId: string,
        data: {
            name: string;
            logo?: string;
            categoryId?: string;
            captainId?: string;
            players: string[];
            registrationStatus?: 'pending' | 'confirmed' | 'rejected';
            feePaid?: boolean;
        }
    ) {
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
                'TeamServiceError'
            );
        }
        await validateChampionshipTeamCapacity(
            tenant,
            championshipId,
            configuration.maxTeams,
            'RegistrationServiceError'
        );

        if (!data.name) {
            throw new CustomError(
                'Team name is required',
                400,
                'TeamServiceError'
            );
        }

        if (!data.players || data.players.length === 0) {
            throw new CustomError(
                'At least one player is required',
                400,
                'TeamServiceError'
            );
        }

        const existingTeam = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                name: data.name,
            }
        );

        if (existingTeam) {
            throw new CustomError(
                'A team with this name already exists in this championship',
                400,
                'TeamServiceError'
            );
        }

        const competitionRules = configuration.competitionRules;

        if (competitionRules?.teamSize) {
            const { minPlayers, maxPlayers } = competitionRules.teamSize;

            if (data.players.length < minPlayers) {
                throw new CustomError(
                    `The team must have at least ${minPlayers} players`,
                    400,
                    'TeamServiceError'
                );
            }

            if (data.players.length > maxPlayers) {
                throw new CustomError(
                    `The team cannot have more than ${maxPlayers} players`,
                    400,
                    'TeamServiceError'
                );
            }
        }

        if (competitionRules?.categories?.enabled) {
            const categoryExists = competitionRules.categories.list.some(
                (category: any) => category.id === data.categoryId
            );

            if (!categoryExists) {
                throw new CustomError(
                    'Invalid category for this championship',
                    400,
                    'TeamServiceError'
                );
            }
        }

        const playerIds = data.players.map(
            (playerId) => new Types.ObjectId(playerId)
        );

        const players = await Player.byTenant(tenant).find({
            _id: {
                $in: playerIds,
            },
            status: 'active',
        });

        if (players.length !== playerIds.length) {
            throw new CustomError(
                'One or more players were not found or are not active',
                400,
                'TeamServiceError'
            );
        }

        validateCompetitionRulesForTeam({
            competitionRules: competitionRules!,
            players,
            categoryId: data.categoryId,
            errorSource: 'TeamServiceError',
        });

        if (data.captainId && !data.players.includes(data.captainId)) {
            throw new CustomError(
                'Captain must be one of the team players',
                400,
                'TeamServiceError'
            );
        }
        if (data.registrationStatus === 'confirmed' && data.feePaid === false) {
            throw new CustomError(
                'A confirmed registration must have the fee paid',
                400,
                'TeamServiceError'
            );
        }

        const team = await DatabaseHelper.create(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                name: data.name,
                logo: data.logo,
                categoryId: data.categoryId,
                captainId: data.captainId
                    ? new Types.ObjectId(data.captainId)
                    : playerIds[0],
                players: playerIds,
                registrations: [],
                participationHistory: [
                    {
                        championshipId: new Types.ObjectId(championshipId),
                        year: new Date().getFullYear(),
                        position: 0,
                    },
                ],
                registrationType: 'manual',
                status: 'active',
            }
        );
        const feePaid = data.feePaid ?? true;

        const registrationStatus =
            data.registrationStatus || (feePaid ? 'confirmed' : 'pending');
        const registration = await DatabaseHelper.create(
            Registration,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                teamId: team._id,
                registrationDate: new Date(),
                registrationStatus,
                feePaid,
                registrationDeadline: configuration.registrationDeadline,
                paymentDate: feePaid ? new Date() : undefined,
            }
        );

        await DatabaseHelper.findOneAndUpdate(
            Team,
            tenant,
            {
                _id: team._id,
            },
            {
                $addToSet: {
                    registrations: registration._id,
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        return {
            team,
            registration,
        };
    }

    async updateTeamManually(
        tenant: string,
        championshipId: string,
        teamId: string,
        data: {
            name?: string;
            logo?: string;
            categoryId?: string;
            captainId?: string;
            players?: string[];
            status?: 'pending' | 'active' | 'inactive' | 'rejected';
        }
    ) {
        await this.ensureTeamCanBeModified(tenant, championshipId);

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
                'TeamServiceError'
            );
        }

        const team = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        if (!team) {
            throw new CustomError(
                'Team not found',
                404,
                'TeamServiceError'
            );
        }

        if (data.name && data.name !== team.name) {
            const existingTeam = await DatabaseHelper.findOne(
                Team,
                tenant,
                {
                    championshipId: new Types.ObjectId(championshipId),
                    name: data.name,
                    _id: {
                        $ne: new Types.ObjectId(teamId),
                    },
                }
            );

            if (existingTeam) {
                throw new CustomError(
                    'A team with this name already exists in this championship',
                    400,
                    'TeamServiceError'
                );
            }
        }

        let finalPlayerIds = team.players;

        const shouldValidateCompetitionRules =
            data.players !== undefined || data.categoryId !== undefined;

        if (shouldValidateCompetitionRules) {
            const players = await Player.byTenant(tenant).find({
                _id: {
                    $in: finalPlayerIds,
                },
                status: 'active',
            });

            if (players.length !== finalPlayerIds.length) {
                throw new CustomError(
                    'One or more players were not found or are not active',
                    400,
                    'TeamServiceError'
                );
            }

            validateCompetitionRulesForTeam({
                competitionRules: configuration.competitionRules!,
                players,
                categoryId: data.categoryId || team.categoryId,
                errorSource: 'TeamServiceError',
            });
        }

        const finalCaptainId = data.captainId
            ? new Types.ObjectId(data.captainId)
            : team.captainId;

        if (finalCaptainId) {
            const captainBelongsToTeam = finalPlayerIds.some(
                (playerId: any) =>
                    playerId.toString() === finalCaptainId.toString()
            );

            if (!captainBelongsToTeam) {
                throw new CustomError(
                    'Captain must be one of the team players',
                    400,
                    'TeamServiceError'
                );
            }
        }

        const updatePayload: Record<string, any> = {};

        if (data.name) updatePayload.name = data.name;
        if (data.logo !== undefined) updatePayload.logo = data.logo;
        if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
        if (data.status) updatePayload.status = data.status;
        if (data.players) updatePayload.players = finalPlayerIds;
        if (finalCaptainId) updatePayload.captainId = finalCaptainId;

        const updatedTeam = await DatabaseHelper.update(
            Team,
            teamId,
            tenant,
            updatePayload
        );

        return updatedTeam;
    }

    async addPlayerToTeam(
        tenant: string,
        championshipId: string,
        teamId: string,
        playerId: string
    ) {
        await this.ensureTeamCanBeModified(tenant, championshipId);

        const team = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        if (!team) {
            throw new CustomError(
                'Team not found',
                404,
                'TeamServiceError'
            );
        }

        const player = await DatabaseHelper.findOne(
            Player,
            tenant,
            {
                _id: new Types.ObjectId(playerId),
                status: 'active',
            }
        );

        if (!player) {
            throw new CustomError(
                'Player not found or inactive',
                404,
                'TeamServiceError'
            );
        }

        const alreadyInTeam = team.players.some(
            (currentPlayerId: any) =>
                currentPlayerId.toString() === playerId
        );

        if (alreadyInTeam) {
            throw new CustomError(
                'Player already belongs to this team',
                400,
                'TeamServiceError'
            );
        }

        const playerInAnotherTeam = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                _id: {
                    $ne: new Types.ObjectId(teamId),
                },
                players: new Types.ObjectId(playerId),
            }
        );

        if (playerInAnotherTeam) {
            throw new CustomError(
                'Player already belongs to another team in this championship',
                400,
                'TeamServiceError'
            );
        }

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
                'TeamServiceError'
            );
        }

        const finalPlayerIds = [
            ...team.players.map((id: any) => new Types.ObjectId(id)),
            new Types.ObjectId(playerId),
        ];

        const maxPlayers = configuration.competitionRules?.teamSize?.maxPlayers;

        if (maxPlayers && finalPlayerIds.length > maxPlayers) {
            throw new CustomError(
                `This team cannot have more than ${maxPlayers} players`,
                400,
                'TeamServiceError'
            );
        }

        const finalPlayers = await DatabaseHelper.find(
            Player,
            tenant,
            {
                _id: {
                    $in: finalPlayerIds,
                },
                status: 'active',
            }
        );

        if (finalPlayers.length !== finalPlayerIds.length) {
            throw new CustomError(
                'One or more players were not found or are inactive',
                400,
                'TeamServiceError'
            );
        }


        validateCompetitionRulesForTeam({
            competitionRules: configuration.competitionRules!,
            players: finalPlayers,
            categoryId: team.categoryId,
            errorSource: 'TeamServiceError',
        });

        const updatedTeam = await DatabaseHelper.findOneAndUpdate(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                $addToSet: {
                    players: new Types.ObjectId(playerId),
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        return updatedTeam;
    }

    async removePlayerFromTeam(
        tenant: string,
        championshipId: string,
        teamId: string,
        playerId: string
    ) {
        await this.ensureTeamCanBeModified(tenant, championshipId);

        const team = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        if (!team) {
            throw new CustomError(
                'Team not found',
                404,
                'TeamServiceError'
            );
        }

        const playerBelongsToTeam = team.players.some(
            (currentPlayerId: any) =>
                currentPlayerId.toString() === playerId
        );

        if (!playerBelongsToTeam) {
            throw new CustomError(
                'Player does not belong to this team',
                400,
                'TeamServiceError'
            );
        }

        if (
            team.captainId &&
            team.captainId.toString() === playerId
        ) {
            throw new CustomError(
                'Cannot remove the team captain. Assign another captain first',
                400,
                'TeamServiceError'
            );
        }

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
                'TeamServiceError'
            );
        }

        const finalPlayerIds = team.players.filter(
            (currentPlayerId: any) =>
                currentPlayerId.toString() !== playerId
        );

        const finalPlayers = await DatabaseHelper.find(
            Player,
            tenant,
            {
                _id: {
                    $in: finalPlayerIds,
                },
                status: 'active',
            }
        );

        validateCompetitionRulesForTeam({
            competitionRules: configuration.competitionRules!,
            players: finalPlayers,
            categoryId: team.categoryId,
            errorSource: 'TeamServiceError',
        });

        const updatedTeam = await DatabaseHelper.findOneAndUpdate(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                $pull: {
                    players: new Types.ObjectId(playerId),
                },
            },
            {
                new: true,
                runValidators: true,
            }
        );

        return updatedTeam;
    }

    async replacePlayerInTeam(
        tenant: string,
        championshipId: string,
        teamId: string,
        oldPlayerId: string,
        newPlayerId: string
    ) {
        await this.ensureTeamCanBeModified(tenant, championshipId);

        const team = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        if (!team) {
            throw new CustomError(
                'Team not found',
                404,
                'TeamServiceError'
            );
        }

        const oldPlayerBelongsToTeam = team.players.some(
            (currentPlayerId: any) =>
                currentPlayerId.toString() === oldPlayerId
        );

        if (!oldPlayerBelongsToTeam) {
            throw new CustomError(
                'Old player does not belong to this team',
                400,
                'TeamServiceError'
            );
        }

        const newPlayerAlreadyInTeam = team.players.some(
            (currentPlayerId: any) =>
                currentPlayerId.toString() === newPlayerId
        );

        if (newPlayerAlreadyInTeam) {
            throw new CustomError(
                'New player already belongs to this team',
                400,
                'TeamServiceError'
            );
        }

        const newPlayer = await DatabaseHelper.findOne(
            Player,
            tenant,
            {
                _id: new Types.ObjectId(newPlayerId),
                status: 'active',
            }
        );

        if (!newPlayer) {
            throw new CustomError(
                'New player not found or inactive',
                404,
                'TeamServiceError'
            );
        }

        const newPlayerInAnotherTeam = await DatabaseHelper.findOne(
            Team,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                _id: {
                    $ne: new Types.ObjectId(teamId),
                },
                players: new Types.ObjectId(newPlayerId),
            }
        );

        if (newPlayerInAnotherTeam) {
            throw new CustomError(
                'New player already belongs to another team in this championship',
                400,
                'TeamServiceError'
            );
        }

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
                'TeamServiceError'
            );
        }

        const finalPlayerIds = team.players.map((currentPlayerId: any) => {
            if (currentPlayerId.toString() === oldPlayerId) {
                return new Types.ObjectId(newPlayerId);
            }

            return new Types.ObjectId(currentPlayerId);
        });

        const finalPlayers = await DatabaseHelper.find(
            Player,
            tenant,
            {
                _id: {
                    $in: finalPlayerIds,
                },
                status: 'active',
            }
        );

        if (finalPlayers.length !== finalPlayerIds.length) {
            throw new CustomError(
                'One or more final players were not found or are inactive',
                400,
                'TeamServiceError'
            );
        }

        validateCompetitionRulesForTeam({
            competitionRules: configuration.competitionRules!,
            players: finalPlayers,
            categoryId: team.categoryId,
            errorSource: 'TeamServiceError',
        });

        const updatePayload: Record<string, any> = {
            players: finalPlayerIds,
        };

        if (
            team.captainId &&
            team.captainId.toString() === oldPlayerId
        ) {
            updatePayload.captainId = new Types.ObjectId(newPlayerId);
        }

        const updatedTeam = await DatabaseHelper.findOneAndUpdate(
            Team,
            tenant,
            {
                _id: new Types.ObjectId(teamId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                $set: updatePayload,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        return updatedTeam;
    }


    private async validatePlayers(playerIds: string[], tenant: string): Promise<void> {
        try {
            // Verificar que todos los IDs son válidos
            if (!playerIds.every(id => Types.ObjectId.isValid(id))) {
                throw new CustomError('Invalid player ID format', 400, 'ValidationError');
            }

            // Buscar todos los jugadores
            const players = await DatabaseHelper.getItems(
                Player,
                tenant,
                {
                    _id: { $in: playerIds },
                    deleted: false,
                    status: 'active'
                }
            );
            if (players.docs.length < playerIds.length) throw new Error('Players not found');


            // Verificar que se encontraron todos los jugadores
            if (Array.isArray(players) && players.length !== playerIds.length) {
                const foundIds = players?.map((p: any) => p._id?.toString() || []);
                const notFound = playerIds.filter(id => !foundIds?.includes(id));
                throw new CustomError(
                    `Players not found or not active: ${notFound.join(', ')}`,
                    404,
                    'ValidationError'
                );
            }

            // Verificar jugadores en otros equipos
            const teamsWithPlayers = await DatabaseHelper.getItems(
                Team,
                tenant,
                {
                    players: { $in: playerIds },
                    deleted: false
                }
            );

            if (Array.isArray(teamsWithPlayers.docs) && teamsWithPlayers.docs.length > 0) {
                const playersInTeams = teamsWithPlayers.docs.reduce((acc: any, team: any) => {
                    const playerIds = team.players?.map((p: any) => p.toString()) || [];
                    return [...acc, ...playerIds];
                }, [] as string[]);

                const duplicatePlayers = playerIds.filter(id => playersInTeams.includes(id));

                throw new CustomError(
                    `Players already in other teams: ${duplicatePlayers.join(', ')}`,
                    422,
                    'ValidationError'
                );
            }

            this.logger.info('Players validation successful');
        } catch (error) {
            this.logger.error('Player validation error:', error);
            throw error instanceof CustomError ? error : new CustomError(
                error instanceof Error ? error.message : 'Error validating players',
                500,
                'ValidationError'
            );
        }
    }


    private get populateOptions() {
        return [
            {
                path: 'championshipId',
                select: 'name status startDate endDate',
            },
            {
                path: 'players',
                select: 'name firstName lastName email documentNumber phone',
            },
            {
                path: 'registrations',
                select: 'status paymentStatus createdAt',
            },
            {
                path: 'captainId',
                select: 'firstName lastName name email phone',
            },
        ];
    }

    private async ensureTeamCanBeModified(
        tenant: string,
        championshipId: string
    ): Promise<void> {
        const groupDistributionExists = await DatabaseHelper.exists(
            GroupDistribution,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: {
                    $in: ['active', 'completed'],
                },
            }
        );

        if (groupDistributionExists) {
            throw new CustomError(
                'Teams cannot be modified because group distribution has already been generated',
                400,
                'TeamServiceError'
            );
        }

        const groupExists = await DatabaseHelper.exists(
            Group,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: {
                    $in: ['active', 'completed'],
                },
            }
        );

        if (groupExists) {
            throw new CustomError(
                'Teams cannot be modified because groups have already been generated',
                400,
                'TeamServiceError'
            );
        }

        const matchExists = await DatabaseHelper.exists(
            Match,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
                status: {
                    $in: ['scheduled', 'in_progress', 'completed'],
                },
            }
        );

        if (matchExists) {
            throw new CustomError(
                'Teams cannot be modified because matches have already been generated',
                400,
                'TeamServiceError'
            );
        }
    }
}

