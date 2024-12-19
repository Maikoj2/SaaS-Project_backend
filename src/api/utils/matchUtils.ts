
import { Types } from 'mongoose';
import { Match } from '../models/mongoose/championschip/match';

export class MatchUtils {
    /**
     * Crear un nuevo partido
     */
    static async createMatch(
        championshipId: string,
        teamAId: string,
        teamBId: string,
        courtId: string,
        startTime: Date,
        round?: string
    ) {
        try {
            const newMatch = new Match({
                championshipId: new Types.ObjectId(championshipId),
                teamA: new Types.ObjectId(teamAId),
                teamB: new Types.ObjectId(teamBId),
                court: new Types.ObjectId(courtId),
                startTime,
                status: 'scheduled',
                round,
                matchNumber: await this.getNextMatchNumber(championshipId)
            });

            return await newMatch.save();
        } catch (error: any) {
            throw new Error(`Error creating match: ${error.message}`);
        }
    }

    /**
     * Actualizar resultado de un set
     */
    static async updateSetResult(
        matchId: string,
        setNumber: number,
        teamAScore: number,
        teamBScore: number,
        duration?: number
    ) {
        try {
            const match = await Match.findById(matchId);
            if (!match) throw new Error('Match not found');

            const setResult = {
                setNumber,
                teamAScore,
                teamBScore,
                duration
            };

            // Actualizar o agregar resultado del set
            const setIndex = match.setResults.findIndex((s: any) => s.setNumber === setNumber);
            if (setIndex >= 0) {
                match.setResults[setIndex] = setResult;
            } else {
                match.setResults.push(setResult);
            }

            // Actualizar estado y ganador si es necesario
            await this.updateMatchStatus(match);

            return await match.save();
        } catch (error: any) {
            throw new Error(`Error updating set result: ${error.message}`);
        }
    }

    /**
     * Buscar partidos por rango de fecha
     */
    static async findMatchesByDateRange(
        startDate: Date,
        endDate: Date,
        tenantId?: string
    ) {
        try {
            let query = Match.find({
                startTime: {
                    $gte: startDate,
                    $lte: endDate
                }
            });

            if (tenantId) {
                query = Match.byTenant(tenantId).find({
                    startTime: {
                        $gte: startDate,
                        $lte: endDate
                    }
                });
            }

            return await query
                .populate('teamA')
                .populate('teamB')
                .populate('court')
                .sort({ startTime: 1 });
        } catch (error: any) {
            throw new Error(`Error finding matches by date range: ${error.message}`);
        }
    }

    /**
     * Buscar partidos de un equipo
     */
    static async findTeamMatches(teamId: string, tenantId?: string) {
        try {
            let query = Match.find({
                $or: [
                    { teamA: new Types.ObjectId(teamId) },
                    { teamB: new Types.ObjectId(teamId) }
                ]
            });

            if (tenantId) {
                query = Match.byTenant(tenantId).find({
                    $or: [
                        { teamA: new Types.ObjectId(teamId) },
                        { teamB: new Types.ObjectId(teamId) }
                    ]
                });
            }

            return await query
                .populate('championshipId')
                .populate('court')
                .sort({ startTime: -1 });
        } catch (error: any) {
            throw new Error(`Error finding team matches: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas de partidos por campeonato
     */
    static async getChampionshipStats(championshipId: string) {
        try {
            return await Match.aggregate([
                { 
                    $match: { 
                        championshipId: new Types.ObjectId(championshipId) 
                    } 
                },
                {
                    $group: {
                        _id: '$status',
                        totalMatches: { $sum: 1 },
                        averageDuration: { $avg: '$duration' },
                        totalSets: { $sum: { $size: '$setResults' } }
                    }
                }
            ]);
        } catch (error: any) {
            throw new Error(`Error getting championship stats: ${error.message}`);
        }
    }

    // Métodos privados de utilidad
    private static async getNextMatchNumber(championshipId: string): Promise<number> {
        const lastMatch = await Match.findOne({ championshipId })
            .sort({ matchNumber: -1 })
            .select('matchNumber');
        return (lastMatch?.matchNumber || 0) + 1;
    }

    private static async updateMatchStatus(match: any) {
        const totalSets = match.setResults.length;
        if (totalSets === 0) return;

        const setsTeamA = match.setResults.filter(
            (set: any) => set.teamAScore > set.teamBScore
        ).length;
        const setsTeamB = totalSets - setsTeamA;

        // Ejemplo para mejor de 3
        if (setsTeamA > 1 || setsTeamB > 1) {
            match.status = 'completed';
            match.winner = setsTeamA > setsTeamB ? match.teamA : match.teamB;
            match.actualEndTime = new Date();
        } else {
            match.status = 'in_progress';
        }
    }
} 



/*
// Ejemplo de uso en un controlador
import { MatchUtils } from '../utils/matchUtils';

export class MatchController {
    async createMatch(req: Request, res: Response) {
        try {
            const { championshipId, teamAId, teamBId, courtId, startTime, round } = req.body;
            const match = await MatchUtils.createMatch(
                championshipId,
                teamAId,
                teamBId,
                courtId,
                new Date(startTime),
                round
            );
            res.json(match);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateSetResult(req: Request, res: Response) {
        try {
            const { matchId } = req.params;
            const { setNumber, teamAScore, teamBScore, duration } = req.body;
            const match = await MatchUtils.updateSetResult(
                matchId,
                setNumber,
                teamAScore,
                teamBScore,
                duration
            );
            res.json(match);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
*/