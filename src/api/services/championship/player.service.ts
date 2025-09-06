
import { Player } from '../../models/championship/player.model';
import { Team } from '../../models/championship/team.model';
import { Statistics } from '../../models/championship/statistics.model';
import { Op } from 'sequelize';

export class PlayerService {
  public async createPlayer(playerData: any): Promise<Player> {
    try {
      // Validate team exists
      const team = await Team.findByPk(playerData.team_id);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check jersey number uniqueness within team
      const existingPlayer = await Player.findOne({
        where: {
          team_id: playerData.team_id,
          jersey_number: playerData.jersey_number
        }
      });

      if (existingPlayer) {
        throw new Error('Jersey number already exists in this team');
      }

      const player = await Player.create(playerData);
      return player;
    } catch (error: any) {
      throw new Error(`Error creating player: ${error.message}`);
    }
  }

  public async getAllPlayers(teamId?: string, championshipId?: string): Promise<Player[]> {
    try {
      const whereClause: any = {};
      const includeClause: any = [];

      if (teamId) {
        whereClause.team_id = teamId;
      }

      if (championshipId) {
        includeClause.push({
          model: Team,
          as: 'team',
          where: { championship_id: championshipId },
          attributes: ['id', 'name']
        });
      } else {
        includeClause.push({
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        });
      }

      const players = await Player.findAll({
        where: whereClause,
        include: includeClause,
        order: [['name', 'ASC']]
      });

      return players;
    } catch (error: any) {
      throw new Error(`Error retrieving players: ${error.message}`);
    }
  }

  public async getPlayerById(id: number): Promise<Player | null> {
    try {
      const player = await Player.findByPk(id, {
        include: [
          {
            model: Team,
            as: 'team',
            attributes: ['id', 'name', 'championship_id']
          },
          {
            model: Statistics,
            as: 'statistics'
          }
        ]
      });

      return player;
    } catch (error: any) {
      throw new Error(`Error retrieving player: ${error.message}`);
    }
  }

  public async updatePlayer(id: number, updateData: any): Promise<Player | null> {
    try {
      const player = await Player.findByPk(id);
      if (!player) {
        return null;
      }

      // If updating jersey number, check uniqueness
      if (updateData.jersey_number && updateData.jersey_number !== player.jersey_number) {
        const existingPlayer = await Player.findOne({
          where: {
            team_id: player.team_id,
            jersey_number: updateData.jersey_number,
            id: { [Op.ne]: id }
          }
        });

        if (existingPlayer) {
          throw new Error('Jersey number already exists in this team');
        }
      }

      await player.update(updateData);
      return player;
    } catch (error: any) {
      throw new Error(`Error updating player: ${error.message}`);
    }
  }

  public async deletePlayer(id: number): Promise<boolean> {
    try {
      const player = await Player.findByPk(id);
      if (!player) {
        return false;
      }

      // Check if player has statistics
      const statsCount = await Statistics.count({ where: { player_id: id } });
      if (statsCount > 0) {
        throw new Error('Cannot delete player with existing statistics');
      }

      await player.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting player: ${error.message}`);
    }
  }

  public async getPlayerStatistics(playerId: number, championshipId?: string): Promise<any> {
    try {
      const whereClause: any = { player_id: playerId };
      const includeClause: any = [];

      if (championshipId) {
        includeClause.push({
          model: Team,
          as: 'team',
          where: { championship_id: championshipId }
        });
      }

      const statistics = await Statistics.findAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']]
      });

      // Calculate totals and averages
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
        statistics: statistics,
        totals: totals,
        averages: {
          points_per_match: matchesPlayed > 0 ? totals.points_scored / matchesPlayed : 0,
          assists_per_match: matchesPlayed > 0 ? totals.assists / matchesPlayed : 0,
          serve_success_rate: totals.serves > 0 ? (totals.successful_serves / totals.serves) * 100 : 0,
          attack_success_rate: totals.attacks > 0 ? (totals.successful_attacks / totals.attacks) * 100 : 0,
          reception_success_rate: totals.receptions > 0 ? (totals.successful_receptions / totals.receptions) * 100 : 0
        }
      };
    } catch (error: any) {
      throw new Error(`Error retrieving player statistics: ${error.message}`);
    }
  }

  public async transferPlayer(playerId: number, newTeamId: number): Promise<Player> {
    try {
      const player = await Player.findByPk(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const newTeam = await Team.findByPk(newTeamId);
      if (!newTeam) {
        throw new Error('New team not found');
      }

      // Check jersey number availability in new team
      const existingPlayer = await Player.findOne({
        where: {
          team_id: newTeamId,
          jersey_number: player.jersey_number
        }
      });

      if (existingPlayer) {
        throw new Error('Jersey number already exists in the new team');
      }

      await player.update({ team_id: newTeamId });
      return player;
    } catch (error: any) {
      throw new Error(`Error transferring player: ${error.message}`);
    }
  }
}
