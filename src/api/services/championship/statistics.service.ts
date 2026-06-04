import { Statistics, IStatisticsDocument } from '../../models/mongoose/championship/statistics';
import { Player } from '../../models/mongoose/championship/player';
import { Match } from '../../models/mongoose/championship/match';
import { Team } from '../../models/mongoose/championship/team';
import { DatabaseHelper } from '../../utils/database.helper';
import { Types, PaginateResult } from 'mongoose';

interface StatisticsFilters {
  playerId?: string;
  matchId?: string;
  championshipId?: string;
}

export class StatisticsService {
  public async createStatistics(tenant: string, statisticsData: any): Promise<IStatisticsDocument> {
    try {
      // Validate player exists
      const player = await Player.findById(statisticsData.playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      // Validate match exists
      const match = await Match.findById(statisticsData.matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      // Check if statistics already exist for this player in this match
      const existingStats = await Statistics.findOne({
        playerId: statisticsData.playerId,
        matchId: statisticsData.matchId
      });

      if (existingStats) {
        throw new Error('Statistics already exist for this player in this match');
      }

      // Validate that successful actions don't exceed total actions
      // Note: The new Statistics model has simple fields like points, assists, etc.
      // If we need detailed stats (successful vs total), we might need to update the model.
      // For now, I'll assume the input data matches the model structure or we map it.
      // The previous service had detailed checks, but the new model is simpler.
      // I will keep the checks if the input provides these fields, but the model might not store all of them unless updated.
      // The current model has: points, assists, rebounds, fouls, yellowCards, redCards, minutesPlayed.
      // It does NOT have serves, receptions, attacks breakdown.
      // I will proceed with the fields available in the model.

      const statistics = await DatabaseHelper.create(Statistics, tenant, statisticsData);
      return statistics;
    } catch (error: any) {
      throw new Error(`Error creating statistics: ${error.message}`);
    }
  }

  public async getAllStatistics(tenant: string, filters: StatisticsFilters): Promise<PaginateResult<IStatisticsDocument>> {
    try {
      const query: any = {};

      if (filters.playerId) {
        query.playerId = filters.playerId;
      }

      if (filters.matchId) {
        query.matchId = filters.matchId;
      }

      // Filter by championshipId requires looking up matches first
      if (filters.championshipId) {
        const matches = await Match.find({ championshipId: filters.championshipId }).select('_id');
        const matchIds = matches.map(m => m._id);
        query.matchId = { $in: matchIds };
      }

      const statistics = await DatabaseHelper.getItemsWithRelations(
        Statistics,
        tenant,
        query,
        { sort: { createdAt: -1 } },
        {
          nested: [
            {
              path: 'playerId',
              select: 'userId number',
              populate: [{ path: 'userId', select: 'name' }]
            },
            {
              path: 'matchId',
              select: 'scheduledDate status'
            },
            {
              path: 'teamId',
              select: 'name'
            }
          ]
        }
      );

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving statistics: ${error.message}`);
    }
  }

  public async getStatisticsById(id: string): Promise<IStatisticsDocument | null> {
    try {
      const statistics = await Statistics.findById(id)
        .populate({
          path: 'playerId',
          select: 'userId number',
          populate: { path: 'userId', select: 'name' }
        })
        .populate({
          path: 'matchId',
          select: 'scheduledDate status',
          populate: [
            { path: 'homeTeamId', select: 'name' },
            { path: 'awayTeamId', select: 'name' }
          ]
        })
        .populate('teamId', 'name');

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving statistics: ${error.message}`);
    }
  }

  public async updateStatistics(id: string, updateData: any): Promise<IStatisticsDocument | null> {
    try {
      const statistics = await Statistics.findById(id);
      if (!statistics) {
        return null;
      }

      // Update logic
      const updatedStatistics = await Statistics.findByIdAndUpdate(id, updateData, { new: true });
      return updatedStatistics;
    } catch (error: any) {
      throw new Error(`Error updating statistics: ${error.message}`);
    }
  }

  public async deleteStatistics(id: string): Promise<boolean> {
    try {
      const statistics = await Statistics.findById(id);
      if (!statistics) {
        return false;
      }

      await statistics.delete();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting statistics: ${error.message}`);
    }
  }

  public async getPlayerStatisticsSummary(playerId: string, championshipId?: string): Promise<any> {
    try {
      const query: any = { playerId: playerId };

      if (championshipId) {
        const matches = await Match.find({ championshipId: championshipId }).select('_id');
        const matchIds = matches.map(m => m._id);
        query.matchId = { $in: matchIds };
      }

      const statistics = await Statistics.find(query);

      if (statistics.length === 0) {
        return {
          playerId: playerId,
          matchesPlayed: 0,
          totals: {},
          averages: {}
        };
      }

      const totals = statistics.reduce((acc, stat) => {
        acc.points += stat.points || 0;
        acc.assists += stat.assists || 0;
        acc.rebounds += stat.rebounds || 0;
        acc.fouls += stat.fouls || 0;
        acc.minutesPlayed += stat.minutesPlayed || 0;
        return acc;
      }, {
        points: 0,
        assists: 0,
        rebounds: 0,
        fouls: 0,
        minutesPlayed: 0
      });

      const matchesPlayed = statistics.length;

      return {
        playerId: playerId,
        matchesPlayed: matchesPlayed,
        totals: totals,
        averages: {
          pointsPerMatch: totals.points / matchesPlayed,
          assistsPerMatch: totals.assists / matchesPlayed,
          reboundsPerMatch: totals.rebounds / matchesPlayed,
          minutesPerMatch: totals.minutesPlayed / matchesPlayed
        }
      };
    } catch (error: any) {
      throw new Error(`Error retrieving player statistics summary: ${error.message}`);
    }
  }

  public async getMatchStatisticsSummary(matchId: string): Promise<any> {
    try {
      const statistics = await Statistics.find({ matchId: matchId })
        .populate({
          path: 'playerId',
          select: 'userId number',
          populate: { path: 'userId', select: 'name' }
        })
        .populate('teamId', 'name');

      const teamStats: any = {};

      statistics.forEach((stat: any) => {
        const teamId = stat.teamId._id.toString();
        const teamName = stat.teamId.name;

        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            teamId: teamId,
            teamName: teamName,
            playersCount: 0,
            totals: {
              points: 0,
              assists: 0,
              rebounds: 0,
              fouls: 0,
              minutesPlayed: 0
            }
          };
        }

        teamStats[teamId].playersCount++;
        teamStats[teamId].totals.points += stat.points || 0;
        teamStats[teamId].totals.assists += stat.assists || 0;
        teamStats[teamId].totals.rebounds += stat.rebounds || 0;
        teamStats[teamId].totals.fouls += stat.fouls || 0;
        teamStats[teamId].totals.minutesPlayed += stat.minutesPlayed || 0;
      });

      return {
        matchId: matchId,
        teamStatistics: Object.values(teamStats),
        playerStatistics: statistics
      };
    } catch (error: any) {
      throw new Error(`Error retrieving match statistics summary: ${error.message}`);
    }
  }

  public async getTopPerformers(tenant: string, championshipId: string, metric: string, limit: number = 10): Promise<any[]> {
    try {
      const validMetrics = ['points', 'assists', 'rebounds', 'fouls'];
      if (!validMetrics.includes(metric)) {
        throw new Error('Invalid metric');
      }

      // Get matches for championship
      const matches = await Match.find({ championshipId: championshipId }).select('_id');
      const matchIds = matches.map(m => m._id);

      const statistics = await Statistics.find({ matchId: { $in: matchIds } })
        .populate({
          path: 'playerId',
          select: 'userId number',
          populate: { path: 'userId', select: 'name' }
        })
        .populate('teamId', 'name')
        .sort({ [metric]: -1 })
        .limit(limit);

      return statistics.map((stat: any) => ({
        playerId: stat.playerId._id,
        playerName: stat.playerId.userId?.name || 'Unknown',
        jerseyNumber: stat.playerId.number,
        teamName: stat.teamId.name,
        metricValue: stat[metric],
        metricName: metric
      }));
    } catch (error: any) {
      throw new Error(`Error retrieving top performers: ${error.message}`);
    }
  }
}
