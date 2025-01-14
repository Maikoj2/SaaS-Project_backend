import { Phase } from '../../models/mongoose/championship/phase';
import { GameFormat, IGameFormatConfig } from '../../models/mongoose/championship/gameFormat';
import { IPhaseDocument } from '../../models/mongoose/championship/phase';
import { CustomError } from '../../errors';
import { Logger } from '../../config';
import { DatabaseHelper } from '../../utils/database.helper';
import ChampionshipConfiguration from '../../models/mongoose/championship/configuration';
import { Schema } from 'mongoose';
import { Types } from 'mongoose';

export class PhaseService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public createPhases = async (championshipId: string, gameFormatId: string, tenant: string, startTime: string): Promise<IPhaseDocument[] | undefined> => {
        try {
            // valido que el formato de juego exista en la configuracion del campeonato y obtengo datos que estan relacionados con el con la configuracion 
            const championshipConfiguration = await DatabaseHelper.findOneWithRelations(ChampionshipConfiguration,
                tenant,
                { gameFormatId: gameFormatId, championshipId: championshipId },
                { basic: ['gameFormatId', 'championshipId'] }
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
            //obtengo las fechas de inicio y fin del campeonato desde la configuracion
            const championshipEndDateString = championshipConfiguration.championshipId.endDate.toISOString();
            const championshipStartDateString = championshipConfiguration.championshipId.startDate.toISOString();

            //calculo la cantidad de dias entre la fecha de inicio y fin del campeonato
            const daysBetween = this.calculateDaysBetween(championshipStartDateString, championshipEndDateString);

            //calculo la cantidad de fases que se van a crear

            const config = championshipConfiguration.gameFormatId.config;
            this.logger.info('config', config);

            switch (championshipConfiguration.gameFormatId.name) {
                case 'elimination_simple':
                    try {
                        if (!config.levels) {
                            throw new CustomError('config not found in game format configuration', 404, 'PhaseServiceError');
                        }
                        this.checkLevels(config.levels);
                        const phases = await this.createEliminationPhases(config.levels, startTime, championshipEndDateString, championshipId, tenant, null);
                        if (!phases || phases.length === 0) {
                            throw new CustomError('phases not created', 404, 'PhaseServiceError');
                        }
                        return phases;
                    } catch (error) {
                        this.logger.error('Error creating elimination phases:', error);
                        throw error;
                    }
                case 'elimination_double':
                    // Lógica para crear fases de eliminación doble
                    // phases.push(...this.createDoubleEliminationPhases(config.levels, startDate));
                    break;
                case 'groups':
                    // Lógica para crear fases de grupos
                    // phases.push(...this.createGroupPhases(config, startDate));
                    break;
                case 'groups_and_elimination':
                    const phases = await this.createGroupAndEliminationPhases(config, startTime, championshipStartDateString, championshipId, tenant);
                    if (!phases || phases.length === 0) {
                        throw new CustomError('phases not created', 404, 'PhaseServiceError');
                    }
                    return phases;

                    this.logger.info(' groups_and_elimination');
                    break;
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
            this.logger.error('Error creating phases:', error);
            throw error;
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


    private calculateDaysBetween(startDate: string, endDate: string): number {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Diferencia en milisegundos
        const differenceInMilliseconds = end.getTime() - start.getTime();

        // Convertir milisegundos a días
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const differenceInDays = differenceInMilliseconds / millisecondsPerDay;

        return differenceInDays;
    }
    // Métodos auxiliares para crear fases específicas
    private createEliminationPhases = async (levels: string[], startTime: string, startDate: string, championshipId: string, tenant: string, sendedPreviousPhaseId: string | null): Promise<IPhaseDocument[]> => {
        try {
            let previousPhaseId: string | undefined = sendedPreviousPhaseId ? sendedPreviousPhaseId : undefined;
            let currentOrder: number = 0;

            if (previousPhaseId) {
                const previousPhase = await DatabaseHelper.findById(Phase, previousPhaseId, tenant);
                if (previousPhase) {
                    const phaseData: IPhaseDocument = previousPhase.toObject();
                    currentOrder = phaseData.order;
                }
            }
            console.log('currentOrder', currentOrder);
            
            const phases: IPhaseDocument[] = [];
            for (let i = 0; i < levels.length; i++) {
                const phaseData = {
                    championshipId: championshipId as unknown as Schema.Types.ObjectId,
                    name: levels[i], // Nombre de la fase (e.g., "round_of_16")
                    order: ++currentOrder, // Orden basado en la posición
                    previousPhaseId: previousPhaseId ? previousPhaseId  as unknown as Schema.Types.ObjectId : undefined, // Fase anterior (null para la primera)
                    status: 'pending' as 'pending' | 'in_progress' | 'completed', // Estado inicial
                    startTime: startTime,
                };
                // Crear la fase en la base de datos
                const phase = await DatabaseHelper.create(Phase, tenant, phaseData);

                // Vincular la fase actual con la siguiente
                if (previousPhaseId) {
                    await DatabaseHelper.update(Phase, previousPhaseId, tenant, { nextPhaseId: phase._id as unknown as Schema.Types.ObjectId });
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

    private createGroupPhases = async (config: IGameFormatConfig, startTime: string, startDate: string, championshipId: string, tenant: string): Promise<IPhaseDocument> => {
        try {
            const phaseData  = {
                championshipId: championshipId as unknown as Schema.Types.ObjectId,
                name: 'groups', 
                order: 1, 
                previousPhaseId: undefined,
                status: 'pending' as 'pending' | 'in_progress' | 'completed', 
                startTime: startTime,
                startDate: new Date(startDate)
            };
            const phase = await DatabaseHelper.create(Phase, tenant, phaseData);
            return phase;
        } catch (error) {
            this.logger.error('Error creating group phases:', error);
            throw error;
        }
    }

    private createGroupAndEliminationPhases = async (config: IGameFormatConfig, startTime: string, startDate: string, championshipId: string, tenant: string): Promise<IPhaseDocument[]> => {
        let phases: IPhaseDocument[] = [];  
        if (!config.levels) {
            throw new CustomError('levels not found in game format configuration', 404, 'PhaseServiceError');
        }
        let groupPhase: IPhaseDocument | null = null;
        if (config.groups) {
            groupPhase = await this.createGroupPhases(config, startTime, startDate, championshipId, tenant);
            if (!groupPhase) {
                throw new CustomError('group phase not created', 404, 'PhaseServiceError');
            }
            phases.push(groupPhase);
        }
        this.checkLevels(config.levels);
        const eliminationPhases = await this.createEliminationPhases(config.levels, startTime, startDate, championshipId, tenant, groupPhase?._id.toString() || null);
        if (!eliminationPhases || eliminationPhases.length === 0) {
            throw new CustomError('phases not created', 404, 'PhaseServiceError');
        }
        if (eliminationPhases[0].previousPhaseId) {
            await DatabaseHelper.update(Phase,
                 phases[0]._id.toString(), 
                 tenant, 
                 { nextPhaseId: eliminationPhases[0]._id as unknown as Schema.Types.ObjectId });
        }

        phases = [...phases, ...eliminationPhases];
        return phases;
    }

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
} 