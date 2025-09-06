
import { Statistics } from '../../models/championship/statistics.model';
import { Player } from '../../models/championship/player.model';
import { Match } from '../../models/championship/match.model';
import { Team } from '../../models/championship/team.model';
import { Op } from 'sequelize';

interface StatisticsFilters {
  player_id?: string;
  match_id?: string;
  championship_id?: string;
}

export class StatisticsService {
  public async createStatistics(statisticsData: any): Promise<Statistics> {
    try {
      // Validate player exists
      const player = await Player.findByPk(statisticsData.player_id);
      if (!player) {
        throw new Error('Player not found');
      }

      // Validate match exists
      const match = await Match.findByPk(statisticsData.match_id);
      if (!match) {
        throw new Error('Match not found');
      }

      // Check if statistics already exist for this player in this match
      const existingStats = await Statistics.findOne({
        where: {
          player_id: statisticsData.player_id,
          match_id: statisticsData.match_id
        }
      });

      if (existingStats) {
        throw new Error('Statistics already exist for this player in this match');
      }

      // Validate that successful actions don't exceed total actions
      if (statisticsData.successful_serves > statisticsData.serves) {
        throw new Error('Successful serves cannot exceed total serves');
      }
      if (statisticsData.successful_receptions > statisticsData.receptions) {
        throw new Error('Successful receptions cannot exceed total receptions');
      }
      if (statisticsData.successful_attacks > statisticsData.attacks) {
        throw new Error('Successful attacks cannot exceed total attacks');
      }

      const statistics = await Statistics.create(statisticsData);
      return statistics;
    } catch (error: any) {
      throw new Error(`Error creating statistics: ${error.message}`);
    }
  }

  public async getAllStatistics(filters: StatisticsFilters): Promise<Statistics[]> {
    try {
      const whereClause: any = {};
      const includeClause: any = [
        {
          model: Player,
          as: 'player',
          attributes: ['id', 'name', 'jersey_number'],
          include: [
            {
              model: Team,
              as: 'team',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: Match,
          as: 'match',
          attributes: ['id', 'scheduled_date', 'status']
        }
      ];

      if (filters.player_id) {
        whereClause.player_id = filters.player_id;
      }

      if (filters.match_id) {
        whereClause.match_id = filters.match_id;
      }

      if (filters.championship_id) {
        includeClause[0].include[0].where = { championship_id: filters.championship_id };
      }

      const statistics = await Statistics.findAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']]
      });

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving statistics: ${error.message}`);
    }
  }

  public async getStatisticsById(id: number): Promise<Statistics | null> {
    try {
      const statistics = await Statistics.findByPk(id, {
        include: [
          {
            model: Player,
            as: 'player',
            attributes: ['id', 'name', 'jersey_number'],
            include: [
              {
                model: Team,
                as: 'team',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: Match,
            as: 'match',
            attributes: ['id', 'scheduled_date', 'status'],
            include: [
              {
                model: Team,
                as: 'team1',
                attributes: ['id', 'name']
              },
              {
                model: Team,
                as: 'team2',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving statistics: ${error.message}`);
    }
  }

  public async updateStatistics(id: number, updateData: any): Promise<Statistics | null> {
    try {
      const statistics = await Statistics.findByPk(id);
      if (!statistics) {
        return null;
      }

      // Validate that successful actions don't exceed total actions
      const newServes = updateData.serves !== undefined ? updateData.serves : statistics.serves;
      const newSuccessfulServes = updateData.successful_serves !== undefined ? updateData.successful_serves : statistics.successful_serves;
      
      if (newSuccessfulServes > newServes) {
        throw new Error('Successful serves cannot exceed total serves');
      }

      const newReceptions = updateData.receptions !== undefined ? updateData.receptions : statistics.receptions;
      const newSuccessfulReceptions = updateData.successful_receptions !== undefined ? updateData.successful_receptions : statistics.successful_receptions;
      
      if (newSuccessfulReceptions > newReceptions) {
        throw new Error('Successful receptions cannot exceed total receptions');
      }

      const newAttacks = updateData.attacks !== undefined ? updateData.attacks : statistics.attacks;
      const newSuccessfulAttacks = updateData.successful_attacks !== undefined ? updateData.successful_attacks : statistics.successful_attacks;
      
      if (newSuccessfulAttacks > newAttacks) {
        throw new Error('Successful attacks cannot exceed total attacks');
      }

      await statistics.update(updateData);
      return statistics;
    } catch (error: any) {
      throw new Error(`Error updating statistics: ${error.message}`);
    }
  }

  public async deleteStatistics(id: number): Promise<boolean> {
    try {
      const statistics = await Statistics.findByPk(id);
      if (!statistics) {
        return false;
      }

      await statistics.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting statistics: ${error.message}`);
    }
  }

  public async getPlayerStatisticsSummary(playerId: number, championshipId?: string): Promise<any> {
    try {
      const whereClause: any = { player_id: playerId };
      const includeClause: any = [];

      if (championshipId) {
        includeClause.push({
          model: Player,
          as: 'player',
          include: [
            {
              model: Team,
              as: 'team',
              where: { championship_id: championshipId }
            }
          ]
        });
      }

      const statistics = await Statistics.findAll({
        where: whereClause,
        include: includeClause
      });

      if (statistics.length === 0) {
        return {
          player_id: playerId,
          matches_played: 0,
          totals: {},
          averages: {}
        };
      }

      const totals = statistics.reduce((acc, stat) => {
        acc.points_scored += stat.points_scored;
        acc.assists += stat.assists;
        acc.blocks += stat.blocks;
        acc.serves += stat.serves;
        acc.successful_serves += stat.successful_serves;
        acc.receptions += stat.receptions;
        acc.successful_receptions += stat.successful_receptions;
        acc.attacks += stat.attacks;
        acc.successful_attacks += stat.successful_attacks;
        acc.errors += stat.errors;
        acc.minutes_played += stat.minutes_played;
        return acc;
      }, {
        points_scored: 0,
        assists: 0,
        blocks: 0,
        serves: 0,
        successful_serves: 0,
        receptions: 0,
        successful_receptions: 0,
        attacks: 0,
        successful_attacks: 0,
        errors: 0,
        minutes_played: 0
      });

      const matchesPlayed = statistics.length;

      return {
        player_id: playerId,
        matches_played: matchesPlayed,
        totals: totals,
        averages: {
          points_per_match: totals.points_scored / matchesPlayed,
          assists_per_match: totals.assists / matchesPlayed,
          blocks_per_match: totals.blocks / matchesPlayed,
          serve_success_rate: totals.serves > 0 ? (totals.successful_serves / totals.serves) * 100 : 0,
          reception_success_rate: totals.receptions > 0 ? (totals.successful_receptions / totals.receptions) * 100 : 0,
          attack_success_rate: totals.attacks > 0 ? (totals.successful_attacks / totals.attacks) * 100 : 0,
          errors_per_match: totals.errors / matchesPlayed,
          minutes_per_match: totals.minutes_played / matchesPlayed
        }
      };
    } catch (error: any) {
      throw new Error(`Error retrieving player statistics summary: ${error.message}`);
    }
  }

  public async getMatchStatisticsSummary(matchId: number): Promise<any> {
    try {
      const statistics = await Statistics.findAll({
        where: { match_id: matchId },
        include: [
          {
            model: Player,
            as: 'player',
            attributes: ['id', 'name', 'jersey_number'],
            include: [
              {
                model: Team,
                as: 'team',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      const teamStats = {};

      statistics.forEach(stat => {
        const teamId = stat.player.team.id;
        const teamName = stat.player.team.name;

        if (!teamStats[teamId]) {
          teamStats[teamId] = {
            team_id: teamId,
            team_name: teamName,
            players_count: 0,
            totals: {
              points_scored: 0,
              assists: 0,
              blocks: 0,
              serves: 0,
              successful_serves: 0,
              receptions: 0,
              successful_receptions: 0,
              attacks: 0,
              successful_attacks: 0,
              errors: 0,
              minutes_played: 0
            }
          };
        }

        teamStats[teamId].players_count++;
        teamStats[teamId].totals.points_scored += stat.points_scored;
        teamStats[teamId].totals.assists += stat.assists;
        teamStats[teamId].totals.blocks += stat.blocks;
        teamStats[teamId].totals.serves += stat.serves;
        teamStats[teamId].totals.successful_serves += stat.successful_serves;
        teamStats[teamId].totals.receptions += stat.receptions;
        teamStats[teamId].totals.successful_receptions += stat.successful_receptions;
        teamStats[teamId].totals.attacks += stat.attacks;
        teamStats[teamId].totals.successful_attacks += stat.successful_attacks;
        teamStats[teamId].totals.errors += stat.errors;
        teamStats[teamId].totals.minutes_played += stat.minutes_played;
      });

      // Calculate success rates for each team
      Object.values(teamStats).forEach((team: any) => {
        team.success_rates = {
          serve_success_rate: team.totals.serves > 0 ? (team.totals.successful_serves / team.totals.serves) * 100 : 0,
          reception_success_rate: team.totals.receptions > 0 ? (team.totals.successful_receptions / team.totals.receptions) * 100 : 0,
          attack_success_rate: team.totals.attacks > 0 ? (team.totals.successful_attacks / team.totals.attacks) * 100 : 0
        };
      });

      return {
        match_id: matchId,
        team_statistics: Object.values(teamStats),
        player_statistics: statistics
      };
    } catch (error: any) {
      throw new Error(`Error retrieving match statistics summary: ${error.message}`);
    }
  }

  public async getTopPerformers(championshipId: string, metric: string, limit: number = 10): Promise<any[]> {
    try {
      const validMetrics = ['points_scored', 'assists', 'blocks', 'serves', 'successful_serves', 'attacks', 'successful_attacks'];
      if (!validMetrics.includes(metric)) {
        throw new Error('Invalid metric');
      }

      const statistics = await Statistics.findAll({
        include: [
          {
            model: Player,
            as: 'player',
            attributes: ['id', 'name', 'jersey_number'],
            include: [
              {
                model: Team,
                as: 'team',
                where: { championship_id: championshipId },
                attributes: ['id', 'name']
              }
            ]
          }
        ],
        order: [[metric, 'DESC']],
        limit: limit
      });

      return statistics.map(stat => ({
        player_id: stat.player_id,
        player_name: stat.player.name,
        jersey_number: stat.player.jersey_number,
        team_name: stat.player.team.name,
        metric_value: stat[metric],
        metric_name: metric
      }));
    } catch (error: any) {
      throw new Error(`Error retrieving top performers: ${error.message}`);
    }
  }
}
