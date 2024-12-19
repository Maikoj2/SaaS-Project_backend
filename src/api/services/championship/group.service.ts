
import { Types } from 'mongoose';
import { IGroupDocument } from '../../models/mongoose/championschip/group';
import { Group } from '../../models/mongoose/championschip/group';
import { Match } from '../../models/mongoose/championschip/match';
import { DatabaseHelper } from '../../utils/database.helper';

export class GroupService {
    /**
     * Crear un nuevo grupo y asignar equipos
     */
    async createGroup(data: {
        groupDistributionId: string;
        name: string;
        teamIds: string[];
    }): Promise<IGroupDocument> {
        try {
            const group = new Group({
                groupDistributionId: new Types.ObjectId(data.groupDistributionId),
                name: data.name,
                teams: data.teamIds.map(id => new Types.ObjectId(id)),
                rankings: data.teamIds.map((teamId: any, index: any) => ({
                    teamId: new Types.ObjectId(teamId),
                    position: index + 1,
                    points: 0,
                    matchesPlayed: 0,
                    matchesWon: 0,
                    matchesLost: 0,
                    setsWon: 0,
                    setsLost: 0,
                    pointsScored: 0,
                    pointsConceded: 0
                }))
            });

            return await group.save();
        } catch (error: any) {
            throw new Error(`Error creating group: ${error.message}`);
        }
    }

    /**
     * Actualizar rankings después de un partido
     */
    // async updateRankingsAfterMatch(groupId: string, matchId: string, tenant: string): Promise<IGroupDocument> {
    //     try {
    //         const match = await DatabaseHelper.findOne(Match, tenant, { _id: matchId }, { throwError: true, errorMessage: 'Match not found' });

    //         if (!match) throw new Error('Match not found');

    //         const group = await Group.findById(groupId);
    //         if (!group) throw new Error('Group not found');

    //         // Calcular estadísticas del partido
    //         const teamAStats = {
    //             setsWon: 0,
    //             setsLost: 0,
    //             pointsScored: 0,
    //             pointsConceded: 0
    //         };

    //         const teamBStats = {
    //             setsWon: 0,
    //             setsLost: 0,
    //             pointsScored: 0,
    //             pointsConceded: 0
    //         };

    //         // Calcular sets y puntos
    //         match.setResults.forEach((set: any) => {
    //             if (set.teamAScore > set.teamBScore) {
    //                 teamAStats.setsWon++;
    //                 teamBStats.setsLost++;
    //             } else {
    //                 teamBStats.setsWon++;
    //                 teamAStats.setsLost++;
    //             }
    //             teamAStats.pointsScored += set.teamAScore;
    //             teamAStats.pointsConceded += set.teamBScore;
    //             teamBStats.pointsScored += set.teamBScore;
    //             teamBStats.pointsConceded += set.teamAScore;
    //         });

    //         // Actualizar rankings
    //         const rankings = group.rankings.map((rank: any) => {
    //             if (rank.teamId.equals(match.teamA._id)) {
    //                 return {
    //                     ...rank,
    //                     matchesPlayed: (rank.matchesPlayed || 0) + 1,
    //                     matchesWon: (rank.matchesWon || 0) + (teamAStats.setsWon > teamBStats.setsWon ? 1 : 0),
    //                     matchesLost: (rank.matchesLost || 0) + (teamAStats.setsWon < teamBStats.setsWon ? 1 : 0),
    //                     setsWon: (rank.setsWon || 0) + teamAStats.setsWon,
    //                     setsLost: (rank.setsLost || 0) + teamAStats.setsLost,
    //                     pointsScored: (rank.pointsScored || 0) + teamAStats.pointsScored,
    //                     pointsConceded: (rank.pointsConceded || 0) + teamAStats.pointsConceded
    //                 };
    //             }
    //             if (rank.teamId.equals(match.teamB._id)) {
    //                 return {
    //                     ...rank,
    //                     matchesPlayed: (rank.matchesPlayed || 0) + 1,
    //                     matchesWon: (rank.matchesWon || 0) + (teamBStats.setsWon > teamAStats.setsWon ? 1 : 0),
    //                     matchesLost: (rank.matchesLost || 0) + (teamBStats.setsWon < teamAStats.setsWon ? 1 : 0),
    //                     setsWon: (rank.setsWon || 0) + teamBStats.setsWon,
    //                     setsLost: (rank.setsLost || 0) + teamBStats.setsLost,
    //                     pointsScored: (rank.pointsScored || 0) + teamBStats.pointsScored,
    //                     pointsConceded: (rank.pointsConceded || 0) + teamBStats.pointsConceded
    //                 };
    //             }
    //             return rank;
    //         });

    //         // Ordenar rankings por puntos, diferencia de sets, etc.
    //         rankings.sort((a: any, b: any  ) => {
    //             if (a.matchesWon !== b.matchesWon) return b.matchesWon - a.matchesWon;
    //             if ((a.setsWon - a.setsLost) !== (b.setsWon - b.setsLost)) 
    //                 return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
    //             return (b.pointsScored - b.pointsConceded) - (a.pointsScored - a.pointsConceded);
    //         });

    //         // Actualizar posiciones
    //         rankings.forEach((rank: any, index: any) => {
    //             rank.position = index + 1;
    //         });
    //         if (!group) throw new Error('Group not found');

    //         return await Group.findByIdAndUpdate(
    //             groupId,
    //             { rankings },
    //             { new: true }
    //         );
    //     } catch (error: any) {
    //         throw new Error(`Error updating rankings: ${error.message}`);
    //     }
    // }

    /**
     * Obtener clasificación del grupo
     */
    async getGroupStandings(groupId: string) {
        try {
            const group = await Group.findById(groupId)
                .populate('teams')
                .populate('rankings.teamId');

            if (!group) throw new Error('Group not found');

            return group.rankings.map((rank: any) => ({
                position: rank.position,
                team: rank.teamId,
                stats: {
                    matchesPlayed: rank.matchesPlayed || 0,
                    matchesWon: rank.matchesWon || 0,
                    matchesLost: rank.matchesLost || 0,
                    setsWon: rank.setsWon || 0,
                    setsLost: rank.setsLost || 0,
                    pointsScored: rank.pointsScored || 0,
                    pointsConceded: rank.pointsConceded || 0
                }
            }));
        } catch (error: any) {
            throw new Error(`Error getting standings: ${error.message}`);
        }
    }
} 