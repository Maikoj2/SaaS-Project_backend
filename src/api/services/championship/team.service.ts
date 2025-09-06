
import { Team } from '../../models/championship/team.model';
import { Player } from '../../models/championship/player.model';
import { Statistics } from '../../models/championship/statistics.model';
import { Op } from 'sequelize';

export class TeamService {
  public async createTeam(teamData: any): Promise<Team> {
    try {
      const team = await Team.create(teamData);
      return team;
    } catch (error: any) {
      throw new Error(`Error creating team: ${error.message}`);
    }
  }

  public async getAllTeams(championshipId?: string): Promise<Team[]> {
    try {
      const whereClause: any = {};
      if (championshipId) {
        whereClause.championship_id = championshipId;
      }

      const teams = await Team.findAll({
        where: whereClause,
        include: [
          {
            model: Player,
            as: 'players',
            attributes: ['id', 'name', 'position', 'jersey_number']
          }
        ],
        order: [['name', 'ASC']]
      });

      return teams;
    } catch (error: any) {
      throw new Error(`Error retrieving teams: ${error.message}`);
    }
  }

  public async getTeamById(id: number): Promise<Team | null> {
    try {
      const team = await Team.findByPk(id, {
        include: [
          {
            model: Player,
            as: 'players',
            attributes: ['id', 'name', 'position', 'jersey_number', 'age']
          }
        ]
      });

      return team;
    } catch (error: any) {
      throw new Error(`Error retrieving team: ${error.message}`);
    }
  }

  public async updateTeam(id: number, updateData: any): Promise<Team | null> {
    try {
      const team = await Team.findByPk(id);
      if (!team) {
        return null;
      }

      await team.update(updateData);
      return team;
    } catch (error: any) {
      throw new Error(`Error updating team: ${error.message}`);
    }
  }

  public async deleteTeam(id: number): Promise<boolean> {
    try {
      const team = await Team.findByPk(id);
      if (!team) {
        return false;
      }

      // Check if team has players
      const playersCount = await Player.count({ where: { team_id: id } });
      if (playersCount > 0) {
        throw new Error('Cannot delete team with active players');
      }

      await team.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting team: ${error.message}`);
    }
  }

  public async getTeamPlayers(teamId: number): Promise<Player[]> {
    try {
      const players = await Player.findAll({
        where: { team_id: teamId },
        order: [['jersey_number', 'ASC']]
      });

      return players;
    } catch (error: any) {
      throw new Error(`Error retrieving team players: ${error.message}`);
    }
  }

  public async getTeamStatistics(teamId: number): Promise<any> {
    try {
      const players = await Player.findAll({
        where: { team_id: teamId },
        include: [
          {
            model: Statistics,
            as: 'statistics'
          }
        ]
      });

      // Calculate team statistics
      let totalStats = {
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
        minutes_played: 0,
        matches_played: 0
      };

      const matchesSet = new Set();

      players.forEach(player => {
        if (player.statistics) {
          player.statistics.forEach((stat: any) => {
            totalStats.points_scored += stat.points_scored;
            totalStats.assists += stat.assists;
            totalStats.blocks += stat.blocks;
            totalStats.serves += stat.serves;
            totalStats.successful_serves += stat.successful_serves;
            totalStats.receptions += stat.receptions;
            totalStats.successful_receptions += stat.successful_receptions;
            totalStats.attacks += stat.attacks;
            totalStats.successful_attacks += stat.successful_attacks;
            totalStats.errors += stat.errors;
            totalStats.minutes_played += stat.minutes_played;
            matchesSet.add(stat.match_id);
          });
        }
      });

      totalStats.matches_played = matchesSet.size;

      return {
        team_id: teamId,
        players_count: players.length,
        statistics: totalStats,
        averages: {
          points_per_match: totalStats.matches_played > 0 ? totalStats.points_scored / totalStats.matches_played : 0,
          assists_per_match: totalStats.matches_played > 0 ? totalStats.assists / totalStats.matches_played : 0,
          serve_success_rate: totalStats.serves > 0 ? (totalStats.successful_serves / totalStats.serves) * 100 : 0,
          attack_success_rate: totalStats.attacks > 0 ? (totalStats.successful_attacks / totalStats.attacks) * 100 : 0
        }
      };
    } catch (error: any) {
      throw new Error(`Error retrieving team statistics: ${error.message}`);
    }
  }
}
