import { Types } from "mongoose";
import Championship from "../../models/mongoose/championship/championship";
import Club from "../../models/mongoose/championship/club";
import Team, { ITeamDocument } from "../../models/mongoose/championship/team";
import { DatabaseHelper } from "../../utils/database.helper";
import { RegistrationService } from "./registration.service";
import { User } from "../../models";
import { CustomError } from "../../errors";
import { Logger } from "../../config";
import Player from "../../models/mongoose/championship/player";




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

            await this.validatePlayers(teamData.players as any[], tenant);
    
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
                const foundIds = players?.map((p:any) => p._id?.toString() || []);
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
            console.log('teamsWithPlayers', teamsWithPlayers.docs);

            if (Array.isArray(teamsWithPlayers.docs) && teamsWithPlayers.docs.length > 0) {
                const playersInTeams = teamsWithPlayers.docs.reduce((acc:any , team:any) => {
                    const playerIds = team.players?.map((p:any) => p.toString()) || [];
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
}

