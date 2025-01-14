// src/api/services/championship/groupDistribution.service.ts

import { PaginateResult, Schema, Types } from "mongoose";
import GroupDistribution, { IGroupDistributionDocument, ITeamDistribution } from "../../models/mongoose/championship/groupsDistrubution";
import { DatabaseHelper } from "../../utils/database.helper";
import Position, { IPositionDocument } from "../../models/mongoose/championship/InitialPosition";
import { CustomError } from "../../errors";
import Group from "../../models/mongoose/championship/group";
import Match from "../../models/mongoose/championship/match";

interface DistributionGroups {
    [key: string]: ITeamDistribution[];
}

type Match = { home: string, away: string };
type RoundsObject = { [key: number]: Match[] };
export class GroupDistributionService {
    async createGroupDistribution(championshipId: string, tenant: string, data: Partial<IGroupDistributionDocument>): Promise<any> {
        const totalTeams = await this.getTotalTeams(tenant, championshipId);
        if (totalTeams.totalDocs === 0) {
            throw new CustomError('No teams found', 404, 'GroupDistributionServiceError');
        }
        const teams = totalTeams.docs.map(team => team.teamId._id.toString());

        // Determinar el número de grupos

        const numberOfGroups = data.cantTeams ? data.cantTeams : this.calculateNumberOfGroups(totalTeams.totalDocs);


        switch (data.formatType) {
            case 'serpentine':
                const groupDistribution = this.teamsDistributionSerpentine(numberOfGroups, totalTeams.totalDocs, teams);

                const groupDistributionData = {
                    championshipId: championshipId as unknown as Schema.Types.ObjectId,
                    name: data.name ||'fase de grupos',
                    cantTeams: totalTeams.totalDocs,
                    cantGroups: numberOfGroups,
                    distribution: groupDistribution,
                    formatType: data.formatType || 'serpentine',
                    status: 'draft' as 'draft' | 'active' | 'completed',
                    customRules: data.customRules || ''
                }
                const groupDistributionCreated = await DatabaseHelper.create(GroupDistribution, tenant, groupDistributionData);
                if (!groupDistributionCreated) {
                    throw new CustomError('Error creating group distribution', 500, 'GroupDistributionServiceError');
                }

                for (const [groupName, teams] of Object.entries(groupDistribution)) {
                    const teamIds = teams.map((team: any) => team.teamId);

                    const matches = await this.generateRoundRobinMatches(teamIds.map((teamId: any) => teamId.toString()), championshipId, tenant);
            
                    const groupData = {
                        groupDistributionId: groupDistributionCreated._id as unknown as Schema.Types.ObjectId,
                        name: groupName,
                        teams: teamIds,
                        matches: [], // Inicialmente vacío, puedes llenarlo más tarde
                        rankings: [], // Inicialmente vacío, puedes llenarlo más tarde
                        status: 'active' as 'active' | 'completed'
                    };
            
                    const groupCreated = await DatabaseHelper.create(Group, tenant, groupData);
                    if (!groupCreated) {
                        throw new CustomError('Error creating group', 500, 'GroupDistributionServiceError');
                    }
                    // for (const round of Object.values(matches)) {
                    //     for (const match of round) {
                    //         const newMatch = {
                    //             championshipId: championshipId as unknown as Schema.Types.ObjectId,
                    //             homeTeamId: match.home as unknown as Schema.Types.ObjectId,
                    //             awayTeamId: match.away as unknown as Schema.Types.ObjectId,
                    //             courtId: [] as unknown as Schema.Types.ObjectId, // Assign correct court ID
                    //             gameFormatId: [] as unknown as Schema.Types.ObjectId, // Assign correct game format ID
                    //             status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
                    //         };
    
                    //         await DatabaseHelper.create(Match, tenant, newMatch);
                    //     }
                    // }
                }
                

                return { groupDistributionCreated };
            case 'linear':
                break;
            case 'random':
                break;
            case 'custom':
                break;
            default:
                throw new CustomError('Invalid format type', 400, 'GroupDistributionServiceError');
        }


        return totalTeams.docs;
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
    private getTotalTeams = async (tenant: string, championshipId: string): Promise<PaginateResult<IPositionDocument>> => {
        try {

            const totalRegistrations = await DatabaseHelper.count(Position, tenant, { championshipId });
            const registrations = await DatabaseHelper.getItemsWithRelations(
                Position,
                tenant,
                { championshipId },
                { sort: { position: 1 }, limit: totalRegistrations, select: ['teamId', 'position'] },
                { basic: ['teamId'], nested: [{ path: 'teamId', select: 'name' }] }
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
    private async generateRoundRobinMatches(teams: string[], championshipId: string, tenant: string): Promise<RoundsObject> {
        const rounds: RoundsObject = {};
        const numberOfTeams = teams.length;

        // Si el número de equipos es impar, añadimos un "bye"
        if (numberOfTeams % 2 !== 0) {
            teams.push('Bye');
        }

        const totalRounds = teams.length - 1;
        const halfSize = teams.length / 2;


        for (let round = 0; round < totalRounds; round++) {
            const roundMatches: Match[] = [];
            for (let i = 0; i < halfSize; i++) {
                const home = teams[i];
                const away = teams[teams.length - 1 - i];
                if (home !== 'Bye' && away !== 'Bye') {
                    // Crear y guardar el partido en la base de datos
                    // const match = {
                    //     championshipId: championshipId as unknown as Schema.Types.ObjectId,
                    //     homeTeamId: home as unknown as Schema.Types.ObjectId, // Asegúrate de que estos IDs sean correctos
                    //     awayTeamId: away as unknown as Schema.Types.ObjectId, // Asegúrate de que estos IDs sean correctos
                    //     courtId: 'null' as unknown as Schema.Types.ObjectId, // Asigna el ID de la cancha si es necesario
                    //     gameFormatId: 'null' as unknown as Schema.Types.ObjectId, // Asigna el ID del formato de juego si es necesario
                    //     status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | undefined
                    // };

                    // await DatabaseHelper.create(Match, tenant, match);
                    roundMatches.push({ home, away });
                    console.log(roundMatches);

                }
            }
            rounds[round + 1] = roundMatches; // Almacena la ronda en el objeto con clave numérica

            // Rotar los equipos (excepto el primero)
            teams.splice(1, 0, teams.pop()!);
        }

        return rounds;
    }
}