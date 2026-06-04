import { Player, IPlayerDocument } from '../../models/mongoose/championship/player';
import { Team } from '../../models/mongoose/championship/team';
import { Statistics } from '../../models/mongoose/championship/statistics';
import { DatabaseHelper } from '../../utils/database.helper';
import { Types, PaginateResult } from 'mongoose';

export class PlayerService {
  public async createPlayer(tenant: string, playerData: any): Promise<IPlayerDocument> {
    try {
      // Validate team exists
      if (playerData.teamId) {
        const team = await Team.findById(playerData.teamId);
        if (!team) {
          throw new Error('Team not found');
        }
      }

      // Check jersey number uniqueness within team
      if (playerData.teamId && playerData.number) {
        const existingPlayer = await Player.findOne({
          teamId: playerData.teamId,
          number: playerData.number
        });

        if (existingPlayer) {
          throw new Error('Jersey number already exists in this team');
        }
      }

      const player = await DatabaseHelper.create(Player, tenant, playerData);
      return player;
    } catch (error: any) {
      throw new Error(`Error creating player: ${error.message}`);
    }
  }

  public async getAllPlayers(tenant: string, teamId?: string, championshipId?: string): Promise<PaginateResult<IPlayerDocument>> {
    try {
      const query: any = {};

      if (teamId) {
        query.teamId = teamId;
      }

      if (championshipId) {
        const teams = await Team.find({ championshipId: championshipId }).select('_id');
        const teamIds = teams.map(t => t._id);
        query.teamId = { $in: teamIds };
      }

      const players = await DatabaseHelper.getItemsWithRelations(
        Player,
        tenant,
        query,
        { sort: { name: 1 } },
        {
          nested: [
            { path: 'userId', select: 'name email' },
            { path: 'teamId', select: 'name' }
          ]
        }
      );

      return players;
    } catch (error: any) {
      throw new Error(`Error retrieving players: ${error.message}`);
    }
  }

  public async getPlayerById(id: string): Promise<IPlayerDocument | null> {
    try {
      const player = await Player.findById(id)
        .populate('userId', 'name email')
        .populate('teamId', 'name championshipId')
        // Statistics are usually separate, but if we want to embed them in response:
        // We can't easily populate virtuals unless defined.
        // We can fetch them separately if needed.
        ;

      return player;
    } catch (error: any) {
      throw new Error(`Error retrieving player: ${error.message}`);
    }
  }

  public async updatePlayer(id: string, updateData: any): Promise<IPlayerDocument | null> {
    try {
      const player = await Player.findById(id);
      if (!player) {
        return null;
      }

      // If updating jersey number, check uniqueness
      if (updateData.number && updateData.number !== player.number && player.teamId) {
        const existingPlayer = await Player.findOne({
          teamId: player.teamId,
          number: updateData.number,
          _id: { $ne: id }
        });

        if (existingPlayer) {
          throw new Error('Jersey number already exists in this team');
        }
      }

      const updatedPlayer = await Player.findByIdAndUpdate(id, updateData, { new: true });
      return updatedPlayer;
    } catch (error: any) {
      throw new Error(`Error updating player: ${error.message}`);
    }
  }

  public async deletePlayer(id: string): Promise<boolean> {
    try {
      const player = await Player.findById(id);
      if (!player) {
        return false;
      }

      // Check if player has statistics
      const statsCount = await Statistics.countDocuments({ playerId: id });
      if (statsCount > 0) {
        throw new Error('Cannot delete player with existing statistics');
      }

      await player.delete();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting player: ${error.message}`);
    }
  }

  public async getPlayerStatistics(playerId: string, championshipId?: string): Promise<any> {
    try {
      const query: any = { playerId: playerId };

      // Filter by championship if provided (requires joining with Match or Team)
      // Statistics has matchId. Match has championshipId.
      if (championshipId) {
        // Find matches in championship
        // This might be expensive. Better to rely on aggregation if possible.
        // Or fetch stats and filter in memory if dataset is small.
        // Or populate match and filter.
      }

      const statistics = await Statistics.find(query)
        .populate({
          path: 'matchId',
          match: championshipId ? { championshipId: championshipId } : {},
          select: 'scheduledDate homeTeamId awayTeamId'
        })
        .sort({ createdAt: -1 });

      // Filter out stats where match is null (due to population filter)
      const validStats = statistics.filter(stat => stat.matchId);

      // Calculate totals and averages
      const totals = validStats.reduce((acc: any, stat: any) => {
        acc.points += stat.points || 0;
        acc.assists += stat.assists || 0;
        acc.blocks += stat.blocks || 0; // Assuming blocks exists in IStatisticsDocument (it was missing in my create call but might be in schema)
        acc.serves += stat.serves || 0;
        acc.aces += stat.aces || 0; // Assuming aces exists
        acc.minutesPlayed += stat.minutesPlayed || 0;
        return acc;
      }, {
        points: 0,
        assists: 0,
        blocks: 0,
        serves: 0,
        aces: 0,
        minutesPlayed: 0
      });

      const matchesPlayed = validStats.length;

      return {
        playerId: playerId,
        matchesPlayed: matchesPlayed,
        statistics: validStats,
        totals: totals,
        averages: {
          pointsPerMatch: matchesPlayed > 0 ? totals.points / matchesPlayed : 0,
          assistsPerMatch: matchesPlayed > 0 ? totals.assists / matchesPlayed : 0,
          // ... other averages
        }
      };
    } catch (error: any) {
      throw new Error(`Error retrieving player statistics: ${error.message}`);
    }
  }

  public async transferPlayer(playerId: string, newTeamId: string): Promise<IPlayerDocument> {
    try {
      const player = await Player.findById(playerId);
      if (!player) {
        throw new Error('Player not found');
      }

      const newTeam = await Team.findById(newTeamId);
      if (!newTeam) {
        throw new Error('New team not found');
      }

      // Check jersey number availability in new team
      if (player.number) {
        const existingPlayer = await Player.findOne({
          teamId: newTeamId,
          number: player.number
        });

        if (existingPlayer) {
          throw new Error('Jersey number already exists in the new team');
        }
      }

      player.teamId = new Types.ObjectId(newTeamId) as any;
      await player.save();
      return player;
    } catch (error: any) {
      throw new Error(`Error transferring player: ${error.message}`);
    }
  }
}
