import { Group, IGroupDocument } from '../../models/mongoose/championship/group';
import { Team } from '../../models/mongoose/championship/team';
import { Phase } from '../../models/mongoose/championship/phase';
import { Match } from '../../models/mongoose/championship/match';
import { DatabaseHelper } from '../../utils/database.helper';
import { Types, PaginateResult } from 'mongoose';

export class GroupService {
  public async createGroup(tenant: string, groupData: any): Promise<IGroupDocument> {
    try {
      // Validate phase exists
      if (groupData.phaseId) {
        const phase = await Phase.findById(groupData.phaseId);
        if (!phase) {
          throw new Error('Phase not found');
        }
      }

      const group = await DatabaseHelper.create(Group, tenant, groupData);
      return group;
    } catch (error: any) {
      throw new Error(`Error creating group: ${error.message}`);
    }
  }

  public async getAllGroups(tenant: string, championshipId?: string, phaseId?: string): Promise<PaginateResult<IGroupDocument>> {
    try {
      const query: any = {};

      if (phaseId) {
        query.phaseId = phaseId;
      }

      if (championshipId) {
        query.championshipId = championshipId;
      }

      const groups = await DatabaseHelper.getItemsWithRelations(
        Group,
        tenant,
        query,
        { sort: { name: 1 } },
        {
          nested: [
            { path: 'phaseId', select: 'name championshipId' },
            { path: 'teams', select: 'name' }
          ]
        }
      );

      return groups;
    } catch (error: any) {
      throw new Error(`Error retrieving groups: ${error.message}`);
    }
  }

  public async getGroupById(id: string): Promise<IGroupDocument | null> {
    try {
      const group = await Group.findById(id)
        .populate('phaseId', 'name championshipId')
        .populate('teams', 'name')
        .populate({
          path: 'matches',
          select: 'scheduledDate status score',
          populate: [
            { path: 'homeTeamId', select: 'name' },
            { path: 'awayTeamId', select: 'name' }
          ]
        });

      return group;
    } catch (error: any) {
      throw new Error(`Error retrieving group: ${error.message}`);
    }
  }

  public async updateGroup(id: string, updateData: any): Promise<IGroupDocument | null> {
    try {
      const group = await Group.findByIdAndUpdate(id, updateData, { new: true });
      return group;
    } catch (error: any) {
      throw new Error(`Error updating group: ${error.message}`);
    }
  }

  public async deleteGroup(id: string): Promise<boolean> {
    try {
      const group = await Group.findById(id);
      if (!group) {
        return false;
      }

      // Check if group has matches
      const matchesCount = await Match.countDocuments({ groupId: id });
      if (matchesCount > 0) {
        throw new Error('Cannot delete group with existing matches');
      }

      await group.delete();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting group: ${error.message}`);
    }
  }

  public async addTeamToGroup(groupId: string, teamId: string): Promise<any> {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const team = await Team.findById(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if team is already in the group
      if (group.teams.includes(teamId as any)) {
        throw new Error('Team is already in this group');
      }

      // Check group capacity (assuming maxTeams is in config or similar, not directly in schema shown but good to keep logic)
      // If schema doesn't have maxTeams, we skip or assume default.
      // For now, just add.

      group.teams.push(teamId as any);
      await group.save();

      return { message: 'Team added to group successfully' };
    } catch (error: any) {
      throw new Error(`Error adding team to group: ${error.message}`);
    }
  }

  public async removeTeamFromGroup(groupId: string, teamId: string): Promise<any> {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      // Check if team is in the group
      if (!group.teams.map(t => t.toString()).includes(teamId)) {
        throw new Error('Team is not in this group');
      }

      // Check if there are matches involving this team in this group
      const matchesCount = await Match.countDocuments({
        groupId: groupId,
        $or: [
          { homeTeamId: teamId },
          { awayTeamId: teamId }
        ]
      });

      if (matchesCount > 0) {
        throw new Error('Cannot remove team with existing matches in this group');
      }

      group.teams = group.teams.filter(t => t.toString() !== teamId);
      await group.save();

      return { message: 'Team removed from group successfully' };
    } catch (error: any) {
      throw new Error(`Error removing team from group: ${error.message}`);
    }
  }

  public async getGroupTeams(groupId: string): Promise<any[]> {
    try {
      const group = await Group.findById(groupId).populate('teams', 'name logoUrl');
      if (!group) {
        throw new Error('Group not found');
      }

      return group.teams;
    } catch (error: any) {
      throw new Error(`Error retrieving group teams: ${error.message}`);
    }
  }

  public async getGroupStandings(groupId: string): Promise<any[]> {
    try {
      const group = await Group.findById(groupId).populate('teams');
      if (!group) {
        throw new Error('Group not found');
      }

      const teams = group.teams as any[]; // Cast to any to access populated fields
      const standings = [];

      for (const team of teams) {
        // Get all matches for this team in this group
        const matches = await Match.find({
          groupId: groupId,
          $or: [
            { homeTeamId: team._id },
            { awayTeamId: team._id }
          ],
          status: 'finished' // Assuming 'finished' is the status for completed matches
        });

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let points_for = 0;
        let points_against = 0;
        const matches_played = matches.length;

        matches.forEach((match: any) => {
          const score = match.score || { homeTeam: 0, awayTeam: 0 };
          if (match.homeTeamId.toString() === team._id.toString()) {
            points_for += score.homeTeam || 0;
            points_against += score.awayTeam || 0;

            if (score.homeTeam > score.awayTeam) {
              wins++;
            } else if (score.homeTeam < score.awayTeam) {
              losses++;
            } else {
              draws++;
            }
          } else {
            points_for += score.awayTeam || 0;
            points_against += score.homeTeam || 0;

            if (score.awayTeam > score.homeTeam) {
              wins++;
            } else if (score.awayTeam < score.homeTeam) {
              losses++;
            } else {
              draws++;
            }
          }
        });

        const total_points = (wins * 3) + (draws * 1); // 3 points for win, 1 for draw
        const point_difference = points_for - points_against;

        standings.push({
          teamId: team._id,
          teamName: team.name,
          matchesPlayed: matches_played,
          wins,
          losses,
          draws,
          pointsFor: points_for,
          pointsAgainst: points_against,
          pointDifference: point_difference,
          totalPoints: total_points
        });
      }

      // Sort standings by total points (desc), then by point difference (desc)
      standings.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        return b.pointDifference - a.pointDifference;
      });

      // Add position
      standings.forEach((standing, index) => {
        (standing as any).position = index + 1;
      });

      return standings;
    } catch (error: any) {
      throw new Error(`Error retrieving group standings: ${error.message}`);
    }
  }
}
