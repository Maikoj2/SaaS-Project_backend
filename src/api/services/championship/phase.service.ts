import { Phase, IPhaseDocument } from '../../models/mongoose/championship/phase';
import { GameFormat, IGameFormatConfig } from '../../models/mongoose/championship/gameFormat';
import { CustomError } from '../../errors';
import { Logger } from '../../config';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import mongoose, { ClientSession, Types } from 'mongoose';
import { PhaseStatus } from '../../constants/championshipStatus.constants';
import { Championship } from '../../models/mongoose/championship/championship';

export class PhaseService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public createPhases = async (championshipId: string, gameFormatId: string, tenant: string, startTime: string): Promise<IPhaseDocument[] | undefined> => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const championshipConfiguration = await DatabaseHelper.findOneWithRelations(ChampionshipConfiguration,
                tenant,
                { gameFormatId: gameFormatId, championshipId: championshipId },
                { basic: ['gameFormatId', 'championshipId'] },
            );

            if (!championshipConfiguration) {
                throw new CustomError('game format not found in championship configuration', 404, 'PhaseServiceError');
            }
            if (!championshipConfiguration.championshipId || !('startDate' in championshipConfiguration.championshipId)) {
                throw new CustomError('championship not found in championship configuration', 404, 'PhaseServiceError');
            }
            if (!championshipConfiguration.gameFormatId || !('name' in championshipConfiguration.gameFormatId)) {
                throw new CustomError('game format not found in championship configuration', 404, 'PhaseServiceError');
            }

            const championshipEndDateString = championshipConfiguration.championshipId.endDate.toISOString();
            const championshipStartDateString = championshipConfiguration.championshipId.startDate.toISOString();

            const config = championshipConfiguration.gameFormatId.config;
            this.logger.info('config', config);

            let phases: IPhaseDocument[] = [];

            switch (championshipConfiguration.gameFormatId.name) {
                case 'elimination_simple': {
                    if (!config.levels) {
                        throw new CustomError('config not found in game format configuration', 404, 'PhaseServiceError');
                    }
                    this.checkLevels(config.levels);
                    phases = await this.createEliminationPhases(config.levels, startTime, championshipEndDateString, championshipId, tenant, null, session);
                    break;
                }
                case 'elimination_double': {
                    // phases = await this.createDoubleEliminationPhases(config.levels, startDate);
                    break;
                }
                case 'groups':
                    // phases = await this.createGroupPhases(config, startDate);
                    break;
                case 'groups_and_elimination': {
                    phases = await this.createGroupAndEliminationPhases(config, startTime, championshipStartDateString, championshipId, tenant, session);
                    break;
                }
                case 'league':
                    // phases = await this.createLeaguePhases(config, startDate);
                    break;
                case 'swiss':
                    // phases = await this.createSwissPhases(config, startDate);
                    break;
                default:
                    throw new CustomError('Unsupported game format', 400, 'PhaseServiceError');
            }

            if (!phases || phases.length === 0) {
                throw new CustomError('phases not created', 404, 'PhaseServiceError');
            }

            await DatabaseHelper.update(Championship,
                championshipId, tenant,
                { phases: phases.map(phase => phase._id ? new Types.ObjectId(phase._id) : undefined) as Types.ObjectId[] },
                {},
                session);

            await session.commitTransaction();
            return phases;

        } catch (error) {
            await session.abortTransaction();
            this.logger.error('Error creating phases:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    public async listPhases(championshipId: string, tenant: string): Promise<IPhaseDocument[]> {
        try {
            return await (Phase as any).byTenant(tenant).findByChampionship(championshipId);
        } catch (error) {
            this.logger.error('Error listing phases:', error);
            throw error;
        }
    }

    public async updatePhase(phaseId: string, updateData: any, tenant: string): Promise<IPhaseDocument> {
        try {
            const updatedPhase = await Phase.byTenant(tenant).findByIdAndUpdate(phaseId, updateData, { new: true });
            if (!updatedPhase) {
                throw new CustomError('Phase not found', 404, 'PhaseServiceError');
            }
            return updatedPhase;
        } catch (error) {
            this.logger.error('Error updating phase:', error);
            throw error;
        }
    }

    public async deletePhase(phaseId: string, tenant: string): Promise<void> {
        try {
            const phase = await Phase.byTenant(tenant).findById(phaseId);
            if (!phase) {
                throw new CustomError('Phase not found', 404, 'PhaseServiceError');
            }
            await phase.delete();
        } catch (error) {
            this.logger.error('Error deleting phase:', error);
            throw error;
        }
    }

    public async configureGroups(phaseId: string, groupSize: number, advancement: number, tenant: string): Promise<any> {
        try {
            // Placeholder for group configuration logic
            return [];
        } catch (error) {
            this.logger.error('Error configuring groups:', error);
            throw error;
        }
    }


    private calculateDaysBetween(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    }

    private createEliminationPhases = async (levels: string[],
        startTime: string,
        startDate: string,
        championshipId: string,
        tenant: string,
        sendedPreviousPhaseId: string | null,
        session: ClientSession
    ): Promise<IPhaseDocument[]> => {
        try {
            let previousPhaseId: string | undefined = sendedPreviousPhaseId ? sendedPreviousPhaseId : undefined;
            let currentOrder: number = 0;

            if (previousPhaseId) {
                const previousPhase = await DatabaseHelper.findById(Phase, previousPhaseId, tenant, {}, session);
                if (previousPhase) {
                    const phaseData: IPhaseDocument = previousPhase.toObject();
                    currentOrder = phaseData.order;
                }
            }

            const phases: IPhaseDocument[] = [];
            for (let i = 0; i < levels.length; i++) {
                const phaseData = {
                    championshipId: championshipId ? new Types.ObjectId(championshipId) : undefined,
                    name: levels[i],
                    order: ++currentOrder,
                    previousPhaseId: previousPhaseId ? new Types.ObjectId(previousPhaseId) : undefined,
                    status: PhaseStatus.PENDING,
                    startTime: new Date(startTime),
                };

                const phase = await DatabaseHelper.create(Phase, tenant, phaseData, session);

                if (previousPhaseId) {
                    await DatabaseHelper.update(Phase, previousPhaseId, tenant, { nextPhaseId: phase._id ? new Types.ObjectId(phase._id) : undefined }, {}, session);
                }

                previousPhaseId = phase._id.toString();
                phases.push(phase);
            }
            return phases;
        } catch (error) {
            this.logger.error('Error creating elimination phases:', error);
            throw error;
        }
    }

    private createDoubleEliminationPhases(config: IGameFormatConfig, startDate: string, championshipId: string, tenant: string): IPhaseDocument[] {
        return [];
    }

    private createGroupPhases = async (
        config: IGameFormatConfig,
        startTime: string,
        startDate: string,
        championshipId: string,
        tenant: string,
        session: ClientSession
    ): Promise<IPhaseDocument> => {
        try {
            const phaseData = {
                championshipId: championshipId ? new Types.ObjectId(championshipId) : undefined,
                name: 'groups',
                order: 1,
                previousPhaseId: undefined,
                status: PhaseStatus.PENDING,
                startTime: new Date(startTime),
                startDate: new Date(startDate)
            };
            const phase = await DatabaseHelper.create(Phase, tenant, phaseData, session);
            return phase;
        } catch (error) {
            this.logger.error('Error creating group phases:', error);
            throw new CustomError(error instanceof Error ? error.message : 'Error creating group phases', 500, 'PhaseServiceError');
        }
    }

    private createGroupAndEliminationPhases = async (
        config: IGameFormatConfig,
        startTime: string,
        startDate: string,
        championshipId: string,
        tenant: string,
        session: ClientSession
    ): Promise<IPhaseDocument[]> => {
        const phases: IPhaseDocument[] = [];
        let groupPhase: IPhaseDocument | null = null;

        this.logger.info('create group and elimination phases');
        if (config.groups) {
            groupPhase = await this.createGroupPhases(config, startTime, startDate, championshipId, tenant, session);
            if (!groupPhase) {
                throw new CustomError('Group phase not created', 404, 'PhaseServiceError');
            }
            phases.push(groupPhase);
        }

        if (!config.levels) throw new CustomError('Levels not found', 404, 'PhaseServiceError');

        const eliminationPhases = await this.createEliminationPhases(
            config.levels,
            startTime,
            startDate,
            championshipId,
            tenant,
            groupPhase?._id.toString() || null,
            session
        );

        if (groupPhase && eliminationPhases.length > 0) {
            const firstEliminationPhase = eliminationPhases[0];

            await DatabaseHelper.update(
                Phase,
                groupPhase._id.toString(),
                tenant,
                { nextPhaseId: firstEliminationPhase._id ? new Types.ObjectId(firstEliminationPhase._id) : undefined },
                {},
                session
            );

            await DatabaseHelper.update(
                Phase,
                firstEliminationPhase._id.toString(),
                tenant,
                { previousPhaseId: groupPhase._id ? new Types.ObjectId(groupPhase._id) : undefined },
                {},
                session
            );
        }

        return [...phases, ...eliminationPhases];
    };

    private createLeaguePhases(config: any, startDate: string): IPhaseDocument[] {
        return [];
    }

    private createSwissPhases(config: any, startDate: string): IPhaseDocument[] {
        return [];
    }

    private checkLevels(levels: string[]): boolean {
        if (!levels || levels.length === 0) {
            throw new CustomError('levels not found in game format configuration', 404, 'PhaseServiceError');
        }
        return true;
    }

    public getAllPhases = async (championshipId?: string, tenant: string = ''): Promise<IPhaseDocument[]> => {
        try {
            const filter = championshipId ? { championshipId } : {};
            const phases = await DatabaseHelper.find(Phase, filter, {});
            return phases || [];
        } catch (error) {
            this.logger.error('Error getting all phases:', error);
            throw new CustomError('Error retrieving phases', 500, 'PhaseServiceError');
        }
    };

    public getPhaseById = async (phaseId: string, tenant: string = ''): Promise<IPhaseDocument | null> => {
        try {
            const phase = await DatabaseHelper.findById(Phase, phaseId, tenant);
            return phase;
        } catch (error) {
            this.logger.error('Error getting phase by id:', error);
            throw new CustomError('Error retrieving phase', 500, 'PhaseServiceError');
        }
    };

    public startPhase = async (phaseId: string, tenant: string = ''): Promise<IPhaseDocument | null> => {
        try {
            const updatedPhase = await DatabaseHelper.update(
                Phase,
                phaseId,
                tenant,
                { status: PhaseStatus.IN_PROGRESS, startDate: new Date() },
                {}
            );
            return updatedPhase;
        } catch (error) {
            this.logger.error('Error starting phase:', error);
            throw new CustomError('Error starting phase', 500, 'PhaseServiceError');
        }
    };

    public finishPhase = async (phaseId: string, tenant: string = ''): Promise<IPhaseDocument | null> => {
        try {
            const updatedPhase = await DatabaseHelper.update(
                Phase,
                phaseId,
                tenant,
                { status: PhaseStatus.COMPLETED, endDate: new Date() },
                {}
            );
            return updatedPhase;
        } catch (error) {
            this.logger.error('Error finishing phase:', error);
            throw new CustomError('Error finishing phase', 500, 'PhaseServiceError');
        }
    };

    public getPhaseGroups = async (phaseId: string, tenant: string = ''): Promise<any[]> => {
        try {
            this.logger.info(`Getting groups for phase ${phaseId} in tenant ${tenant}`);
            return [];
        } catch (error) {
            this.logger.error('Error getting phase groups:', error);
            throw new CustomError('Error retrieving phase groups', 500, 'PhaseServiceError');
        }
    };

    public getPhaseMatches = async (phaseId: string, tenant: string = ''): Promise<any[]> => {
        try {
            this.logger.info(`Getting matches for phase ${phaseId} in tenant ${tenant}`);
            return [];
        } catch (error) {
            this.logger.error('Error getting phase matches:', error);
            throw new CustomError('Error retrieving phase matches', 500, 'PhaseServiceError');
        }
    };
}