import { Phase } from '../../models/mongoose/championship/phase';
import { GameFormat, IGameFormatConfig } from '../../models/mongoose/championship/gameFormat';
import { IPhaseDocument } from '../../models/mongoose/championship/phase';
import { CustomError } from '../../errors';
import { Logger } from '../../config';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import mongoose, { ClientSession, Schema } from 'mongoose';
import { Types } from 'mongoose';
import { GameFormatType, Gender, PhaseStatus } from '../../constants/championshipStatus.constants';
import { Championship } from '../../models/mongoose/championship/championship';
import Match from '../../models/mongoose/championship/match';

interface MatchDurationParams {
    gender: Gender;
    avgSetsPerMatch: number;
    historicalData?: {
        avgDuration: number;
        tiebreakerProbability: number;
    };
}

interface GameFormatConfig {
    sets: number;
    pointsPerSet: number;
    tiebreakerPoints: number;
    maxPointsPerSet: number;
    minAdvantage: boolean;
}

export class PhaseService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public createPhases = async (championshipId: string, gameFormatId: string, tenant: string, startTime: string): Promise<IPhaseDocument[] | undefined> => {
        const session = await mongoose.startSession(); // Iniciar sesión
        session.startTransaction();

        try {
            // valido que el formato de juego exista en la configuracion del campeonato y obtengo datos que estan relacionados con el con la configuracion 
            const championshipConfiguration = await DatabaseHelper.findOneWithRelations(ChampionshipConfiguration,
                tenant,
                { gameFormatId: gameFormatId, championshipId: championshipId },
                { basic: ['gameFormatId', 'championshipId'] },

            );
            this.logger.info('championshipConfiguration', championshipConfiguration);

            if (!championshipConfiguration) {
                throw new CustomError('game format not found in championship configuration', 404, 'PhaseServiceError');
            }
            if (!championshipConfiguration.championshipId || !('startDate' in championshipConfiguration.championshipId)) {
                throw new CustomError('championship not found in championship configuration', 404, 'PhaseServiceError');
            }
            if (!championshipConfiguration.gameFormatId || !('name' in championshipConfiguration.gameFormatId)) {
                throw new CustomError('game format not found in championship configuration', 404, 'PhaseServiceError');
            }
            //obtengo las fechas de inicio y fin del campeonato desde la configuracion
            const championshipEndDateString = championshipConfiguration.championshipId.endDate.toISOString();
            const championshipStartDateString = championshipConfiguration.championshipId.startDate.toISOString();



            const config = championshipConfiguration.gameFormatId.config;

            switch (championshipConfiguration.gameFormatId.name) {
                case 'elimination_simple': {

                    if (!config.levels) {
                        throw new CustomError('config not found in game format configuration', 404, 'PhaseServiceError');
                    }
                    this.checkLevels(config.levels);
                    const phases = await this.createEliminationPhases(config.levels, startTime, championshipEndDateString, championshipId, tenant, null, session);
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
                }

                case 'elimination_double': {
                    // Lógica para crear fases de eliminación doble
                    // phases.push(...this.createDoubleEliminationPhases(config.levels, startDate));
                    break;
                }
                case 'groups':
                    // Lógica para crear fases de grupos
                    // phases.push(...this.createGroupPhases(config, startDate));
                    break;
                case 'groups_and_elimination': {
                    const phases = await this.createGroupAndEliminationPhases(
                        config,
                        startTime,
                        championshipStartDateString, // Fecha inicio campeonato
                        championshipEndDateString,   // Nueva: Fecha fin campeonato
                        championshipId,
                        tenant,
                        session);
                    if (!phases || phases.length === 0) {
                        throw new CustomError('phases not created', 404, 'PhaseServiceError');
                    }
                    await session.commitTransaction();
                    return phases;
                }
                case 'league':
                    // Lógica para crear fases de liga
                    // phases.push(...this.createLeaguePhases(config, startDate));
                    break;
                case 'swiss':
                    // Lógica para crear fases de sistema suizo
                    // phases.push(...this.createSwissPhases(config, startDate));
                    break;
                default:
                    throw new CustomError('Unsupported game format', 400, 'PhaseServiceError');
            }









            //             const gameFormat = await GameFormat.byTenant(tenant).findById(gameFormatId);
            //             if (!gameFormat) {
            //                 throw new CustomError('Game format not found', 404, 'PhaseServiceError');
            //             }

            //             // Lógica para crear fases basadas en el formato de juego
            //  // Aquí deberías implementar la lógica para crear las fases
            //             // Ejemplo: Crear fases de eliminación directa, grupos, etc.

            //             return await Phase.byTenant(tenant).insertMany(phases);
        } catch (error) {
            await session.abortTransaction();
            this.logger.error('Error creating phases:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    public async listPhases(championshipId: string, tenant: string): Promise<any> {
        // try {
        //     return await Phase.byTenant(tenant).findByChampionship(championshipId);
        // } catch (error) {
        //     this.logger.error('Error listing phases:', error);
        //     throw error;
        // }
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
            // const phase = await Phase.byTenant(tenant).findById(phaseId);
            // if (!phase) {
            //     throw new CustomError('Phase not found', 404, 'PhaseServiceError');
            // }

            // // Lógica para configurar grupos dentro de la fase
            // const groups = []; // Aquí deberías implementar la lógica para crear y configurar los grupos

            // return groups;
        } catch (error) {
            this.logger.error('Error configuring groups:', error);
            throw error;
        }
    }


    private calculateDaysBetween(startDate: Date, endDate: Date): number {
        const diffMs = endDate.getTime() - startDate.getTime();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24)); 
    }
    // Métodos auxiliares para crear fases específicas
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
                    name: levels[i], // Nombre de la fase (e.g., "round_of_16")
                    order: ++currentOrder, // Orden basado en la posición
                    previousPhaseId: previousPhaseId ? new Types.ObjectId(previousPhaseId) : undefined, // Fase anterior (null para la primera)
                    status: PhaseStatus.PENDING, // Estado inicial
                    startTime: new Date(startTime),
                };
                // Crear la fase en la base de datos
                const phase = await DatabaseHelper.create(Phase, tenant, phaseData, session);

                // Vincular la fase actual con la siguiente
                if (previousPhaseId) {
                    await DatabaseHelper.update(Phase, previousPhaseId, tenant, { nextPhaseId: phase._id ? new Types.ObjectId(phase._id) : undefined }, {}, session);
                }

                // Actualizar previousPhaseId para el siguiente ciclo
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
        // Implementa la lógica para crear fases de eliminación doble
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
                name: GameFormatType.GROUPS,
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
        startTime: string, // Formato ISO: "2025-12-01T07:00:00"
        championshipStartDateStr: string,
        championshipEndDateStr: string,
        championshipId: string,
        tenant: string,
        session: ClientSession
    ): Promise<IPhaseDocument[]> => {
        const startDate = new Date(championshipStartDateStr);
        const endDate = new Date(championshipEndDateStr);
        const totalDays = this.calculateDaysBetween(startDate, endDate);
    
        // 1. Crear fase de grupos (50% del tiempo)
        const groupPhaseEnd = new Date(startDate);
        groupPhaseEnd.setDate(startDate.getDate() + Math.floor(totalDays * 0.5));
        
        const groupPhase = await this.createGroupPhases(
            config,
            startTime, // Mantener hora original
            startDate.toISOString(),
            championshipId,
            tenant,
            session
        );
    
        // 2. Programar eliminatorias
        let currentPhaseDate = new Date(groupPhaseEnd);
        currentPhaseDate.setDate(currentPhaseDate.getDate() + 1); // Iniciar al día siguiente
        const eliminationPhases: IPhaseDocument[] = [];
        const timeParts = startTime.split('T')[1].substring(0, 5); // "07:00"
    
        for (const level of config.levels || []) {
            const phaseStart = new Date(currentPhaseDate);
            phaseStart.setHours(parseInt(timeParts.split(':')[0]), parseInt(timeParts.split(':')[1]));
            
            const phaseEnd = new Date(phaseStart);
            phaseEnd.setDate(phaseStart.getDate() + 1); // Duración de 1 día por fase
    
            const phase = await DatabaseHelper.create(Phase, tenant, {
                championshipId: new Types.ObjectId(championshipId),
                name: level,
                startDate: phaseStart,
                endDate: phaseEnd,
                startTime: new Date(phaseStart.toISOString()),
                order: eliminationPhases.length + 2,
                previousPhaseId: eliminationPhases.length === 0 
                    ? groupPhase._id 
                    : eliminationPhases[eliminationPhases.length - 1]._id
            }, session);
    
            eliminationPhases.push(phase);
            currentPhaseDate = new Date(phaseEnd);
        }
    
        return [groupPhase, ...eliminationPhases];
    };

    private createLeaguePhases(config: any, startDate: string): IPhaseDocument[] {
        // Implementa la lógica para crear fases de liga
        return [];
    }

    private createSwissPhases(config: any, startDate: string): IPhaseDocument[] {
        // Implementa la lógica para crear fases de sistema suizo
        return [];
    }

    private checkLevels(levels: string[]): boolean {
        if (!levels || levels.length === 0) {
            throw new CustomError('levels not found in game format configuration', 404, 'PhaseServiceError');
        }
        return true;
    }
    private calculatePhaseDates(
        championshipStart: Date,
        championshipEnd: Date,
        phaseCount: number
    ): Date[] {
        const interval = (championshipEnd.getTime() - championshipStart.getTime()) / phaseCount;
        return Array.from({ length: phaseCount }, (_, i) =>
            new Date(championshipStart.getTime() + (i * interval))
        );
    }
    public async scheduleExistingPhases(
        championshipId: string,
        tenant: string,
        startDate: Date,
        endDate: Date,
        dailyStartTime: string = "07:00"
    ): Promise<IPhaseDocument[]> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Obtener fases existentes
            const phases = await DatabaseHelper.getItemsWithRelations(
                Phase,
                tenant,
                { championshipId },
                { sort: { order: 1 } },
                {},
                session
            );

            if (!phases || phases.totalDocs === 0) {
                throw new CustomError('No phases found to schedule', 404, 'PhaseServiceError');
            }

            // 2. Calcular distribución temporal
            const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
            const schedule = await this.calculatePhaseSchedule(phases.docs, tenant, session, startDate, durationDays, dailyStartTime);

            // 3. Actualizar fases con horarios
            const updatedPhases = await this.updatePhaseTimes(schedule, tenant, session);

            await session.commitTransaction();
            return updatedPhases;
        } catch (error) {
            await session.abortTransaction();
            this.logger.error('Error scheduling phases:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    private async calculatePhaseSchedule(
        phases: IPhaseDocument[],
        tenant: string,
        session: ClientSession,
        startDate: Date,
        totalDays: number,
        dailyStart: string
    ): Promise<Map<string, { startTime: Date; endTime: Date }>> {
        const scheduleMap = new Map<string, { startTime: Date; endTime: Date }>();
        const phasesPerDay = this.distributePhasesPerDay(phases, totalDays);
        let currentDate = new Date(startDate);

        // Corregir: Usar for...of para manejar async/await correctamente
        for (const [dayIndex, dailyPhases] of phasesPerDay) {
            let currentTime = this.combineDateTime(currentDate, dailyStart);

            // Cambiar forEach por bucle for
            for (const phase of dailyPhases) {
                const phaseDuration = await this.calculatePhaseDuration(phase, tenant, session);
                const endTime = new Date(currentTime.getTime() + phaseDuration * 60000);

                scheduleMap.set(phase._id.toString(), {
                    startTime: new Date(currentTime),
                    endTime: endTime
                });

                currentTime = new Date(endTime.getTime() + 30 * 60000);
            }

            currentDate = this.addDays(currentDate, 1);
        }

        return scheduleMap;
    }

    private distributePhasesPerDay(phases: IPhaseDocument[], totalDays: number): Map<number, IPhaseDocument[]> {
        // Usar distribución más balanceada
        const distribution = new Map<number, IPhaseDocument[]>();
        let currentDay = 0;

        phases.forEach((phase, index) => {
            if (!distribution.has(currentDay)) distribution.set(currentDay, []);
            distribution.get(currentDay)!.push(phase);

            if ((index + 1) % Math.ceil(phases.length / totalDays) === 0) currentDay++;
        });

        return distribution;
    }

    private async updatePhaseTimes(
        schedule: Map<string, { startTime: Date; endTime: Date }>,
        tenant: string,
        session: ClientSession
    ): Promise<IPhaseDocument[]> {
        const updatedPhases: IPhaseDocument[] = [];

        for (const [phaseId, times] of schedule) {
            const updatedPhase = await DatabaseHelper.update(
                Phase,
                phaseId,
                tenant,
                {
                    startTime: times.startTime,
                    endTime: times.endTime,
                    status: PhaseStatus.SCHEDULED
                },
                { new: true },
                session
            );

            if (updatedPhase) updatedPhases.push(updatedPhase);
        }

        return updatedPhases;
    }

    private combineDateTime(date: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(Number);
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            hours,
            minutes
        );
    }

    private async calculatePhaseDuration(
        phase: IPhaseDocument,
        tenant: string,
        session: ClientSession
    ): Promise<number> {
        // 1. Obtener partidos de la fase
        const matches = await DatabaseHelper.getItemsWithRelations(
            Match,
            tenant,
            { phaseId: phase._id },
            { select: ['courtId'] },
            {},
            session
        );

        // 2. Obtener configuración del campeonato
        const config = await DatabaseHelper.findOneWithRelations(ChampionshipConfiguration,
            tenant,
            { championshipId: phase.championshipId },
            { basic: ['gameFormatId', 'championshipId'] },
            {},
            session
        );

        if (!config || !config.courts || config.courts.length === 0) {
            throw new CustomError('Configuración incompleta del campeonato', 400, 'PhaseServiceError');
        }

        // 3. Obtener formato de juego
        const gameFormat = config.gameFormatId as unknown as GameFormatConfig;

        // 4. Calcular parámetros clave
        const matchParams: MatchDurationParams = {
            gender: config.gender, // Asumiendo que el championship tiene campo gender
            avgSetsPerMatch: 3, // Valor por defecto, ajustar según lógica de negocio
            historicalData: {
                avgDuration: 45,
                tiebreakerProbability: 0.3
            }
        };

        // 5. Calcular duración
        const totalMatches = matches.totalDocs;
        const avgSets = await this.calculateAverageSets(phase, tenant, session);
        const matchDuration = this.calculateMatchDuration(gameFormat, matchParams);
        const breakTime = 15; // minutos entre partidos
        const totalCourts = config.courts.length;

        const matchesPerCourt = Math.ceil(totalMatches / totalCourts);
        return (matchDuration * this.getSetFactor(avgSets) + breakTime) * matchesPerCourt - breakTime;
    }

    private calculateMatchDuration(
        format: GameFormatConfig,
        params: MatchDurationParams
    ): number {
        const BASE_DURATION_PER_POINT = 0.8;
        const GENDER_MODIFIER = { male: 1.1, female: 1.0, mixed: 1.0 };
        if (format.sets < 1 || format.pointsPerSet < 15) {
            throw new CustomError('Configuración de formato inválida', 400, 'PhaseServiceError');
        }
        let totalDuration = 0;
        for (let set = 1; set <= format.sets; set++) {
            const isTiebreaker = set === format.sets && format.sets > 1;
            const basePoints = isTiebreaker ? format.tiebreakerPoints : format.pointsPerSet;
            const complexityFactor = format.minAdvantage ? 1.2 : 1.0;

            totalDuration += basePoints * BASE_DURATION_PER_POINT * complexityFactor;
        }

        return totalDuration * GENDER_MODIFIER[params.gender];
    }
    private addDays(date: Date, days: number): Date {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    // Nuevos métodos auxiliares:
    private async calculateAverageSets(
        phase: IPhaseDocument,
        tenant: string,
        session: ClientSession
    ): Promise<number> {
        const result = await Match.aggregate([
            { $match: { phaseId: phase._id } },
            { $group: { _id: null, avgSets: { $avg: "$setsPlayed" } } }
        ]).session(session);

        return result[0]?.avgSets || 3; // Default 3 si no hay datos
    }
    private getSetFactor(avgSets: number): number {
        return 1 + (avgSets - 3) * 0.2; // +20% por set adicional
    }
} 