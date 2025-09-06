
import { Group } from '../../models/championship/group.model';
import { Team } from '../../models/championship/team.model';
import { Phase } from '../../models/championship/phase.model';
import { Match } from '../../models/championship/match.model';
import { Op } from 'sequelize';

export class GroupService {
  public async createGroup(groupData: any): Promise<Group> {
    try {
      // Validate phase exists
      const phase = await Phase.findByPk(groupData.phase_id);
      if (!phase) {
        throw new Error('Phase not found');
      }

      const group = await Group.create(groupData);
      return group;
    } catch (error: any) {
      throw new Error(`Error creating group: ${error.message}`);
    }
  }

  public async getAllGroups(championshipId?: string, phaseId?: string): Promise<Group[]> {
    try {
      const whereClause: any = {};
      const includeClause: any = [
        {
          model: Phase,
          as: 'phase',
          attributes: ['id', 'name', 'championship_id']
        },
        {
          model: Team,
          as: 'teams',
          attributes: ['id', 'name']
        }
      ];

      if (phaseId) {
        whereClause.phase_id = phaseId;
      }

      if (championshipId) {
        includeClause[0].where = { championship_id: championshipId };
      }

      const groups = await Group.findAll({
        where: whereClause,
        include: includeClause,
        order: [['name', 'ASC']]
      });

      return groups;
    } catch (error: any) {
      throw new Error(`Error retrieving groups: ${error.message}`);
    }
  }

  public async getGroupById(id: number): Promise<Group | null> {
    try {
      const group = await Group.findByPk(id, {
        include: [
          {
            model: Phase,
            as: 'phase',
            attributes: ['id', 'name', 'championship_id']
          },
          {
            model: Team,
            as: 'teams',
            attributes: ['id', 'name']
          },
          {
            model: Match,
            as: 'matches',
            attributes: ['id', 'scheduled_date', 'status', 'team1_score', 'team2_score'],
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

      return group;
    } catch (error: any) {
      throw new Error(`Error retrieving group: ${error.message}`);
    }
  }

  public async updateGroup(id: number, updateData: any): Promise<Group | null> {
    try {
      const group = await Group.findByPk(id);
      if (!group) {
        return null;
      }

      await group.update(updateData);
      return group;
    } catch (error: any) {
      throw new Error(`Error updating group: ${error.message}`);
    }
  }

  public async deleteGroup(id: number): Promise<boolean> {
    try {
      const group = await Group.findByPk(id);
      if (!group) {
        return false;
      }

      // Check if group has matches
      const matchesCount = await Match.count({ where: { group_id: id } });
      if (matchesCount > 0) {
        throw new Error('Cannot delete group with existing matches');
      }

      await group.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting group: ${error.message}`);
    }
  }

  public async addTeamToGroup(groupId: number, teamId: number): Promise<any> {
    try {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const team = await Team.findByPk(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if team is already in the group
      const existingAssociation = await group.hasTeam(team);
      if (existingAssociation) {
        throw new Error('Team is already in this group');
      }

      // Check group capacity
      const currentTeamsCount = await group.countTeams();
      if (group.max_teams && currentTeamsCount >= group.max_teams) {
        throw new Error('Group has reached maximum capacity');
      }

      await group.addTeam(team);
      return { message: 'Team added to group successfully' };
    } catch (error: any) {
      throw new Error(`Error adding team to group: ${error.message}`);
    }
  }

  public async removeTeamFromGroup(groupId: number, teamId: number): Promise<any> {
    try {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const team = await Team.findByPk(teamId);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if team is in the group
      const existingAssociation = await group.hasTeam(team);
      if (!existingAssociation) {
        throw new Error('Team is not in this group');
      }

      // Check if there are matches involving this team in this group
      const matchesCount = await Match.count({
        where: {
          group_id: groupId,
          [Op.or]: [
            { team1_id: teamId },
            { team2_id: teamId }
          ]
        }
      });

      if (matchesCount > 0) {
        throw new Error('Cannot remove team with existing matches in this group');
      }

      await group.removeTeam(team);
      return { message: 'Team removed from group successfully' };
    } catch (error: any) {
      throw new Error(`Error removing team from group: ${error.message}`);
    }
  }

  public async getGroupTeams(groupId: number): Promise<Team[]> {
    try {
      const group = await Group.findByPk(groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const teams = await group.getTeams({
        attributes: ['id', 'name', 'logo_url'],
        order: [['name', 'ASC']]
      });

      return teams;
    } catch (error: any) {
      throw new Error(`Error retrieving group teams: ${error.message}`);
    }
  }

  public async getGroupStandings(groupId: number): Promise<any[]> {
    try {
      const teams = await this.getGroupTeams(groupId);
      const standings = [];

      for (const team of teams) {
        // Get all matches for this team in this group
        const matches = await Match.findAll({
          where: {
            group_id: groupId,
            [Op.or]: [
              { team1_id: team.id },
              { team2_id: team.id }
            ],
            status: 'finished'
          }
        });

        let wins = 0;
        let losses = 0;
        let draws = 0;
        let points_for = 0;
        let points_against = 0;
        let matches_played = matches.length;

        matches.forEach(match => {
          if (match.team1_id === team.id) {
            points_for += match.team1_score || 0;
            points_against += match.team2_score || 0;
            
            if (match.team1_score > match.team2_score) {
              wins++;
            } else if (match.team1_score < match.team2_score) {
              losses++;
            } else {
              draws++;
            }
          } else {
            points_for += match.team2_score || 0;
            points_against += match.team1_score || 0;
            
            if (match.team2_score > match.team1_score) {
              wins++;
            } else if (match.team2_score < match.team1_score) {
              losses++;
            } else {
              draws++;
            }
          }
        });

        const total_points = (wins * 3) + (draws * 1); // 3 points for win, 1 for draw
        const point_difference = points_for - points_against;

        standings.push({
          team_id: team.id,
          team_name: team.name,
          matches_played,
          wins,
          losses,
          draws,
          points_for,
          points_against,
          point_difference,
          total_points
        });
      }

      // Sort standings by total points (desc), then by point difference (desc)
      standings.sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return b.point_difference - a.point_difference;
      });

      // Add position
      standings.forEach((standing, index) => {
        standing.position = index + 1;
      });

      return standings;
    } catch (error: any) {
      throw new Error(`Error retrieving group standings: ${error.message}`);
    }
  }
}
