import { Team, ITeamDocument } from '../../models/mongoose/championship/team';
import { DatabaseHelper } from '../../utils/database.helper';
import { PaginateResult } from 'mongoose';

export class TeamService {
  public async createTeam(tenant: string, teamData: any): Promise<ITeamDocument> {
    return await DatabaseHelper.create(Team, tenant, teamData);
  }

  public async getAllTeams(tenant: string, championshipId?: string): Promise<PaginateResult<ITeamDocument>> {
    const query: any = {};
    if (championshipId) {
      query.championshipId = championshipId;
    }
    // Using getItemsWithRelations to fetch players
    return await DatabaseHelper.getItemsWithRelations(
      Team,
      tenant,
      1, // Default page
      1000, // Large limit to get all teams if pagination not strictly required by controller yet
      query,
      [{ path: 'players', select: 'name position number' }]
    );
  }

  public async getTeamById(tenant: string, id: string): Promise<ITeamDocument | null> {
    return await DatabaseHelper.findById(Team, tenant, id, [{ path: 'players', select: 'name position number' }]);
  }

  public async updateTeam(tenant: string, id: string, teamData: any): Promise<ITeamDocument | null> {
    return await DatabaseHelper.update(Team, tenant, id, teamData);
  }

  public async deleteTeam(tenant: string, id: string): Promise<boolean> {
    return await DatabaseHelper.delete(Team, tenant, id);
  }

  public async addPlayerToTeam(tenant: string, teamId: string, playerId: string): Promise<ITeamDocument | null> {
    const team = await DatabaseHelper.findById(Team, tenant, teamId);
    if (!team) return null;

    // Check if player is already in team
    if (team.players.some((p: any) => p.toString() === playerId)) {
      return team;
    }

    team.players.push(playerId as any);
    return await team.save();
  }

  public async removePlayerFromTeam(tenant: string, teamId: string, playerId: string): Promise<ITeamDocument | null> {
    const team = await DatabaseHelper.findById(Team, tenant, teamId);
    if (!team) return null;

    team.players = team.players.filter((p: any) => p.toString() !== playerId);
    return await team.save();
  }

  public async getTeamStats(tenant: string, teamId: string, championshipId?: string): Promise<any> {
    // Placeholder implementation as per original service, but adapted
    return {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsScored: 0,
      pointsConceded: 0
    };
  }
}
