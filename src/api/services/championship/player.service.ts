import { DatabaseHelper } from '../../utils/database.helper';
import { Player, IPlayerDocument, IPlayerStats, IndoorVolleyballPosition, BeachVolleyballPosition } from '../../models/mongoose/championship/player';
import { Logger } from '../../config/logger/WinstonLogger';
import InvitationLink from '../../models/mongoose/championship/invitationLink';
import { RegistrationService } from './registration.service';
import { User } from '../../models';
import Club from '../../models/mongoose/championship/club';
import Championship, { ChampionshipType } from '../../models/mongoose/championship/championship';
import { CustomError } from '../../errors';



const selectFields = ['number', 'position', 'status', 'experience', 'clubId', 'eps', 'epsProvider', 'dateOfBirth', 'height', 'weight'];
const userSelectFields = ['id', 'name', 'lastName', 'email', 'typeIdCard', 'numberIdCard'];
export class PlayerService {
    private logger: Logger;
    private registrationService: RegistrationService;

    constructor() {
        this.logger = new Logger();
        this.registrationService = new RegistrationService();
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
            }else {
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
                    isMember: false,
                });

            return player;
        } catch (error) {
            this.logger.error('Error creating player:', error);
            throw error;
        }
    }
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

    // async updatePlayerStats(
    //     tenant: string, 
    //     playerId: string, 
    //     newStats: Partial<IPlayerStats>
    // ): Promise<IPlayerDocument> {


    // }

    // async findByUserId(tenant: string, userId: string): Promise<IPlayerDocument> {


    // }
}
