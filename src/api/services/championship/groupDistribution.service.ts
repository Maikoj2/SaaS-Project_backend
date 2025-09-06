// src/api/services/championship/groupDistribution.service.ts

import mongoose, { ClientSession, PaginateResult, Schema, Types } from "mongoose";
import GroupDistribution, { DistributionGroups, IGroupDistributionDocument, ITeamDistribution } from "../../models/mongoose/championship/groupsDistrubution";
import { DatabaseHelper } from "../../utils/database.helper";
import Position, { IPositionDocument } from "../../models/mongoose/championship/InitialPosition";
import { CustomError } from "../../errors";
import Group, { IGroupDocument } from "../../models/mongoose/championship/group";
import Match, { IMatchDocument } from "../../models/mongoose/championship/match";
import { GroupDistributionFormatType, GroupDistributionStatus, GroupStatus, MatchStatus } from "../../constants/championshipStatus.constants";
import ChampionshipConfiguration, { IConfigurationDocument } from "../../models/mongoose/championship/configuration";
import { ICourtDocument } from "../../models/mongoose/championship/court";
import { IChampionshipDocument } from "../../models/mongoose/championship/championship";
import Phase from "../../models/mongoose/championship/phase";




export type typeRoundsObject = {
    [key: string]: matchType[]
};
type matchType = {
    home: string;
    away: string;
}
export class GroupDistributionService {
    async createGroupDistribution(championshipId: string, tenant: string, data: Partial<IGroupDistributionDocument>, startTime: string = '08:00', intervalMinutes: number = 45, breakBetweenMatches: number = 5): Promise<any> {

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const totalTeams = await this.getTotalTeams(tenant, championshipId, session);
            const configuration = await this.getChampionshipConfiguration(championshipId, tenant, session);
            const championshipDoc = configuration.docs[0].championshipId as IChampionshipDocument;


            console.log('configuration', JSON.stringify(configuration, null, 2));
            //validations
            if (totalTeams.totalDocs === 0) throw new CustomError('No teams found', 404, 'GroupDistributionServiceError');
            if (configuration.totalDocs !== 1) throw new CustomError('Invalid championship configuration', 400, 'GroupDistributionServiceError');

            const numberOfGroups = data.cantTeams ? data.cantTeams : this.calculateNumberOfGroups(totalTeams.totalDocs);
            const teams = totalTeams.docs.map(team => team.teamId._id.toString());
            let groupDistributionCreated: IGroupDistributionDocument;

            switch (data.formatType) {
                case GroupDistributionFormatType.SERPENTINE:
                    const groupDistribution = this.teamsDistributionSerpentine(numberOfGroups, totalTeams.totalDocs, teams);
                    console.log('groupDistribution', groupDistribution);
                    groupDistributionCreated = await this.saveGroupDistribution(
                        championshipId,
                        tenant,
                        data,
                        totalTeams.totalDocs,
                        numberOfGroups,
                        groupDistribution,
                        session
                    );
                    const courts = configuration.docs[0].courts.map((court) => court._id as unknown as ICourtDocument);
                    const phaseId = await this.getPhaseId(championshipId, tenant, session);
                    const groups = await this.createGroups(
                        championshipDoc._id,
                        groupDistributionCreated._id,
                        groupDistribution,
                        tenant,
                        session
                    );
                    console.log('groups', groups);
                    
                    const matches = await this.generateAndScheduleMatches(
                        groupDistribution,
                        championshipDoc,
                        courts,
                        phaseId,
                        startTime,
                        intervalMinutes,
                        breakBetweenMatches,
                        tenant,
                        session,
                        groups // Pasar grupos como parámetro
                    );
                     await this.linkMatchesToGroups(groups, matches, session, tenant, phaseId);


                    await session.commitTransaction();
                    return { groups, matches, groupDistributionCreated };
                // return { groupDistributionCreated };
                case 'linear':
                    break;
                case 'random':
                    break;
                case 'custom':
                    break;
                default:
                    throw new CustomError('Invalid format type', 400, 'GroupDistributionServiceError');
            }

            await session.commitTransaction();
            return totalTeams.docs;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }

    }

    // async getGroupDistributions(championshipId: string): Promise<IGroupDistributionDocument[]> {
    //     return await GroupDistribution.findByChampionship(championshipId);
    // }

    // async updateGroupDistribution(id: string, distribution: { [key: string]: any }): Promise<IGroupDistributionDocument | null> {
    //     return await GroupDistribution.updateDistribution(id, distribution);
    // }

    // async deleteGroupDistribution(id: string): Promise<IGroupDistributionDocument | null> {
    //     return await GroupDistribution.findByIdAndDelete(id);
    // }
    private async generateAndScheduleMatches(
        distribution: DistributionGroups,
        championship: IChampionshipDocument,
        courts: ICourtDocument[],
        phaseId: Types.ObjectId,
        startTime: string,
        interval: number,
        breakMinutes: number,
        tenant: string,
        session: ClientSession,
        groups: IGroupDocument[]
    ): Promise<IMatchDocument[]> {
        const matchesToCreate: IMatchDocument[] = [];
        const groupNameToIdMap = new Map<string, Types.ObjectId>();
        groups.forEach(group => groupNameToIdMap.set(group.name, group._id));
        const accumulatedGroupIds: Types.ObjectId[] = [];

        for (const [groupName, teams] of Object.entries(distribution)) {
            const groupId = groupNameToIdMap.get(groupName);
            if (!groupId) throw new CustomError(`Group ${groupName} not found`, 404);
            accumulatedGroupIds.push(groupId);
            const teamIds = teams.map(t => t.teamId.toString());
            const matches = this.generateRoundRobinMatches(teamIds);
            const reorganizedMatches = this.reorganizeMatchesByRound(matches,championship,phaseId,groupId, groupName);
            const matchesWithTimes = this.assignTimesToMatches(reorganizedMatches, startTime, interval, breakMinutes, championship.startDate);
            const matchesWithCourts = this.assignMatchesToCourts(matchesWithTimes, courts);
    

            matchesToCreate.push(...matchesWithCourts);
        }
        await DatabaseHelper.findOneAndUpdate(Phase, tenant, { _id: phaseId }, { groups: accumulatedGroupIds }, {
            new: true,
            upsert: true
        }, session);
        this.printSchedule(matchesToCreate);

        return DatabaseHelper.saveDocumentsIndividually(Match, tenant, matchesToCreate, session);
    }
    printSchedule(matches: IMatchDocument[]) {
        const scheduleByCourt = matches.reduce((acc, match) => {
            const court = match.court || 'Sin asignar';
            acc[court] = acc[court] || [];
            acc[court].push(match);
            return acc;
        }, {} as Record<string, IMatchDocument[]>);
        console.log('scheduleByCourt', scheduleByCourt);

        Object.entries(scheduleByCourt).forEach(([court, matches]) => {
            console.log(`\n${court}:`);
            console.table(matches.map(m => ({
                Horario: `${m.startTime?.toLocaleTimeString()} - ${m.endTime?.toLocaleTimeString()}`,
                Partido: `${m.homeTeamId} vs ${m.awayTeamId}`,
                Grupo: m.group,
                Ronda: m.round
            })));
        });
    }


    private async createGroups(
        championshipId: Types.ObjectId,
        distributionId: Types.ObjectId,
        distribution: DistributionGroups,
        tenant: string,
        session: ClientSession
    ): Promise<IGroupDocument[]> {
        const groupsToCreate = Object.entries(distribution).map(([groupName, teams]) => ({
            championshipId,
            groupDistributionId: distributionId,
            name: groupName,
            teams: teams.map(t => t.teamId),
            rankings: teams.map(team => ({
                teamId: team.teamId,
                position: team.position,
                points: 0,
                pointsFor: 0,
                pointsAgainst: 0,
                matchesPlayed: 0,
                won: 0,
                lost: 0,
                drawn: 0,
                setsWon: 0,
                setsLost: 0,
                setsDifference: 0,
                setsPlayed: 0,
                yellowCards: 0,
                redCards: 0
            })),
            status: GroupStatus.ACTIVE
        }));
        const groupDocuments = groupsToCreate.map(groupData => new Group(groupData));

        return DatabaseHelper.saveDocumentsIndividually(Group, tenant, groupDocuments, session);
    }

    private saveGroupDistribution(championshipId: string, tenant: string, data: Partial<IGroupDistributionDocument>, totalTeams: number, numberOfGroups: number, groupDistribution: DistributionGroups, session: ClientSession): Promise<IGroupDistributionDocument> {
        const groupDistributionData = {
            championshipId: championshipId ? new Types.ObjectId(championshipId) : undefined,
            name: data.name || 'fase de grupos',
            cantTeams: totalTeams,
            cantGroups: numberOfGroups,
            distribution: groupDistribution,
            formatType: data.formatType || GroupDistributionFormatType.SERPENTINE,
            status: GroupDistributionStatus.DRAFT,
            customRules: data.customRules || ''
        };
        return DatabaseHelper.create(GroupDistribution, tenant, groupDistributionData, session);
    }
    private getTotalTeams = async (tenant: string, championshipId: string, session: ClientSession): Promise<PaginateResult<IPositionDocument>> => {
        try {

            const totalRegistrations = await DatabaseHelper.count(Position, tenant, { championshipId }, session);
            const registrations = await DatabaseHelper.getItemsWithRelations(
                Position,
                tenant,
                { championshipId },
                { sort: { position: 1 }, limit: totalRegistrations, select: ['teamId', 'position'] },
                { basic: ['teamId'], nested: [{ path: 'teamId', select: 'name' }] },
                session
            );


            return registrations;
        } catch (error) {
            throw new CustomError(error instanceof Error ? error.message : 'Error getting total teams', 500, 'GroupDistributionServiceError');;
        }
    }
    private calculateNumberOfGroups(totalTeams: number): number {
        // Encuentra un divisor razonable del total de equipos
        for (let i = Math.floor(totalTeams / 4); i > 1; i--) {
            if (totalTeams % i === 0) {
                return i;
            }
        }
        return 1; // Si no se encuentra un divisor, usar un solo grupo
    }
    private generarPosiciones(cantidad: number): number[] {
        return Array.from({ length: cantidad }, (_, index) => {
            // Determinar el sufijo correcto
            return index + 1;
        });
    }
    private async getPhaseId(championshipId: string, tenant: string, session: ClientSession) {
        const phase = await DatabaseHelper.getItemsWithRelations(
            Phase,
            tenant,
            { championshipId, order: 1 },
            { },
            { basic: ['_id'] },
            session
        );
        return phase.docs[0]._id;
    }

    private teamsDistributionSerpentine(numberOfGroups: number, totalTeams: number, teams: string[]): DistributionGroups {


        let groupDistribution: DistributionGroups = {};
        // Generar posiciones dinámicamente
        let positions = this.generarPosiciones(Math.ceil(totalTeams / numberOfGroups));
        let groupNames = Array.from(
            { length: numberOfGroups },
            (_, i) => `${String.fromCharCode(65 + i)}`
        );

        // Inicializar todos los grupos necesarios
        groupNames.forEach(groupName => {
            groupDistribution[groupName] = [];
        });

        let teamIndex = 0;
        let directionRight = true;

        // Recorrer por filas (posiciones)
        for (let positionIndex = 0; positionIndex < positions.length; positionIndex++) {
            // Determinar el orden de los grupos según la dirección
            let groupsIndex = directionRight
                ? Array.from({ length: numberOfGroups }, (_, i) => i)
                : Array.from({ length: numberOfGroups }, (_, i) => numberOfGroups - 1 - i);

            // Recorrer grupos en la dirección actual
            for (let i = 0; i < numberOfGroups && teamIndex < teams.length; i++) {
                const groupIndex = groupsIndex[i];
                const groupName = groupNames[groupIndex];
                const team = teams[teamIndex];
                const position = positions[positionIndex];

                groupDistribution[groupName].push({
                    teamId: team as unknown as Schema.Types.ObjectId,
                    position,
                    group: groupName
                });
                teamIndex++;
            }

            // Cambiar dirección para la siguiente fila
            directionRight = !directionRight;
        }
        return groupDistribution;


    }
    private generateRoundRobinMatches(teams: string[]): typeRoundsObject {
        const rounds: typeRoundsObject = {};
        const numberOfTeams = teams.length;
        const teamsCopy = [...teams];
        // Si el número de equipos es impar, añadimos un "bye"
        if (numberOfTeams % 2 !== 0) {
            teamsCopy.push('Bye');
        }

        const totalRounds = teams.length - 1;
        const halfSize = teams.length / 2;


        for (let round = 0; round < totalRounds; round++) {
            const roundMatches:  matchType[] = [];
            for (let i = 0; i < halfSize; i++) {
                const home = teams[i];
                const away = teamsCopy[teamsCopy.length - 1 - i];
                if (home !== 'Bye' && away !== 'Bye') {
                    roundMatches.push({ home, away });
                }
            }
            rounds[round + 1] = roundMatches; // Almacena la ronda en el objeto con clave numérica

            // Rotar los equipos (excepto el primero)
            teamsCopy.splice(1, 0, teamsCopy.pop()!);
        }

        return rounds;
    }
    private async getChampionshipConfiguration(championshipId: string, tenant: string, session: ClientSession) {
        return await DatabaseHelper.getItemsWithRelations(
            ChampionshipConfiguration,
            tenant,
            { championshipId },
            { select: ['courts', 'gameFormatId', 'matchDuration', 'championshipId'] },
            {
                basic: ['courts', 'gameFormatId', 'championshipId'],
                nested: [
                    { path: 'courts', select: 'name schedule' },
                    { path: 'gameFormatId', select: 'name' },
                    { path: 'championshipId', select: 'name startDate endDate' }
                ]
            },
            session
        );
    }
    private assignMatchesToCourts(matches: Partial<IMatchDocument>[], courts: ICourtDocument[]): IMatchDocument[] {
        const courtSchedules = new Map<Types.ObjectId, Array<{ startTime: Date, endTime: Date }>>();
        courts.forEach(court => courtSchedules.set(court._id, []));

        const sortedMatches = [...matches].sort((a, b) => {
            const timeDiff = a.startTime!.getTime() - b.startTime!.getTime();
            return timeDiff !== 0 ? timeDiff : (a.group || '').localeCompare(b.group || '');
        });

        const assignedMatches: IMatchDocument[] = [];
        let currentCourtIndex = 0;

        for (const match of sortedMatches) {
            let assignedCourtId: Types.ObjectId | null = null;
            for (const court of courts) {
                const schedule = courtSchedules.get(court._id)!;
                const isAvailable = !schedule.some(s => 
                    match.startTime! < s.endTime && 
                    match.endTime! > s.startTime
                );
                if (isAvailable) {
                    schedule.push({ startTime: match.startTime!, endTime: match.endTime! });
                    assignedCourtId = court._id;
                    break;
                }
            }

            if (!assignedCourtId) {
                const court = courts[currentCourtIndex % courts.length];
                courtSchedules.get(court._id)!.push({ startTime: match.startTime!, endTime: match.endTime! });
                assignedCourtId = court._id;
                currentCourtIndex++;
            }
            const updatedMatch = new Match({
                ...match,
                courtId: assignedCourtId
            });
            assignedMatches.push(updatedMatch);
        }

        return assignedMatches;
    }

    private groupMatchesByRoundGroup(matches: Partial<IMatchDocument>[]): Map<string, Partial<IMatchDocument>[]> {
        const groups = new Map<string, Partial<IMatchDocument>[]>();
        for (const match of matches) {
            const key = `${match.group}-Ronda ${match.round}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(match);
        }
        return groups;
    }

    private reorganizeMatchesByRound(groups: typeRoundsObject,championship: IChampionshipDocument,phaseId: Types.ObjectId,groupId: Types.ObjectId, groupName: string): Partial<IMatchDocument>[] {
        return Object.entries(groups).flatMap(([roundNumber, matches]) =>
                matches.map((match: any) => ({
                    homeTeamId: new Types.ObjectId(match.home),
                    awayTeamId: new Types.ObjectId(match.away),
                    round: roundNumber,
                    groupId: groupId,
                    group: groupName,
                    championshipId: championship._id,
                    phaseId: phaseId,
                    status: MatchStatus.SCHEDULED,
                    score: {
                        homeTeam: 0,
                        awayTeam: 0,
                        periods: []
                    }
                }))
            );
    }



    // 2. Asignación de horarios por bloques de rondas
    private assignTimesToMatches(matches:  Partial<IMatchDocument>[], startTime: string, intervalMinutes: number, breakBetweenMatches: number, startDate: Date): Partial<IMatchDocument>[] {
        const roundGroups = this.groupMatchesByRoundGroup(matches);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        let currentTime = new Date(startDate);
        currentTime.setHours(startHour, startMinute, 0, 0);

        const sortedRounds = Array.from(roundGroups.keys()).sort((a, b) => {
            const roundA = parseInt(a.split('-')[1].replace('Ronda ', ''));
            const roundB = parseInt(b.split('-')[1].replace('Ronda ', ''));
            return roundA - roundB;
        });

        sortedRounds.forEach(roundKey => {
            const matchesInRound = roundGroups.get(roundKey) || [];
            const duration = intervalMinutes;

            matchesInRound.forEach(match => {
                match.startTime = new Date(currentTime);
                match.endTime = new Date(currentTime.getTime() + duration * 60000);
            });

            currentTime = new Date(currentTime.getTime() + (duration + breakBetweenMatches) * 60000);
        });
        
        return matches;
    }
    private async linkMatchesToGroups(groups: IGroupDocument[], matches: IMatchDocument[], session: ClientSession, tenant: string, phaseId: Types.ObjectId): Promise<void> {
        for (const group of groups) {
            const groupMatches = matches.filter(m => 
                m.groupId?.toString() === group._id.toString()
            );
            group.matches = groupMatches.map(m => m._id);
            await group.save({ session });
        }
        const accumulatedMatchesIds: Types.ObjectId[] = [];
        matches.forEach(match => {
            accumulatedMatchesIds.push(match._id as Types.ObjectId);
        });
        console.log('accumulatedMatchesIds', accumulatedMatchesIds);
            await DatabaseHelper.findOneAndUpdate(Phase, tenant, { _id: phaseId }, { matches: accumulatedMatchesIds }, {
            new: true,
            upsert: true
        }, session);
    }
}