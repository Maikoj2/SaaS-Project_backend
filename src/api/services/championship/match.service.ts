
import { Match } from '../../models/championship/match.model';
import { Team } from '../../models/championship/team.model';
import { Phase } from '../../models/championship/phase.model';
import { Group } from '../../models/championship/group.model';
import { Court } from '../../models/championship/court.model';
import { Referee } from '../../models/championship/referee.model';
import { Statistics } from '../../models/championship/statistics.model';
import { Op } from 'sequelize';

interface MatchFilters {
  championship_id?: string;
  phase_id?: string;
  group_id?: string;
  status?: string;
}

export class MatchService {
  public async createMatch(matchData: any): Promise<Match> {
    try {
      // Validate teams exist and are different
      const team1 = await Team.findByPk(matchData.team1_id);
      const team2 = await Team.findByPk(matchData.team2_id);

      if (!team1 || !team2) {
        throw new Error('One or both teams not found');
      }

      if (matchData.team1_id === matchData.team2_id) {
        throw new Error('A team cannot play against itself');
      }

      // Validate phase exists
      if (matchData.phase_id) {
        const phase = await Phase.findByPk(matchData.phase_id);
        if (!phase) {
          throw new Error('Phase not found');
        }
      }

      // Validate court exists and is available
      if (matchData.court_id) {
        const court = await Court.findByPk(matchData.court_id);
        if (!court) {
          throw new Error('Court not found');
        }

        if (court.status !== 'available') {
          throw new Error('Court is not available');
        }
      }

      const match = await Match.create(matchData);
      return match;
    } catch (error: any) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  public async getAllMatches(filters: MatchFilters): Promise<Match[]> {
    try {
      const whereClause: any = {};
      const includeClause: any = [
        {
          model: Team,
          as: 'team1',
          attributes: ['id', 'name']
        },
        {
          model: Team,
          as: 'team2',
          attributes: ['id', 'name']
        },
        {
          model: Phase,
          as: 'phase',
          attributes: ['id', 'name', 'type']
        },
        {
          model: Court,
          as: 'court',
          attributes: ['id', 'name', 'location']
        },
        {
          model: Referee,
          as: 'referee',
          attributes: ['id', 'name']
        }
      ];

      if (filters.championship_id) {
        includeClause[0].where = { championship_id: filters.championship_id };
        includeClause[1].where = { championship_id: filters.championship_id };
      }

      if (filters.phase_id) {
        whereClause.phase_id = filters.phase_id;
      }

      if (filters.group_id) {
        whereClause.group_id = filters.group_id;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      const matches = await Match.findAll({
        where: whereClause,
        include: includeClause,
        order: [['scheduled_date', 'ASC']]
      });

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving matches: ${error.message}`);
    }
  }

  public async getMatchById(id: number): Promise<Match | null> {
    try {
      const match = await Match.findByPk(id, {
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
          },
          {
            model: Phase,
            as: 'phase',
            attributes: ['id', 'name', 'type']
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name']
          },
          {
            model: Court,
            as: 'court',
            attributes: ['id', 'name', 'location']
          },
          {
            model: Referee,
            as: 'referee',
            attributes: ['id', 'name']
          },
          {
            model: Statistics,
            as: 'statistics'
          }
        ]
      });

      return match;
    } catch (error: any) {
      throw new Error(`Error retrieving match: ${error.message}`);
    }
  }

  public async updateMatch(id: number, updateData: any): Promise<Match | null> {
    try {
      const match = await Match.findByPk(id);
      if (!match) {
        return null;
      }

      // Prevent updating finished matches
      if (match.status === 'finished' && updateData.status !== 'finished') {
        throw new Error('Cannot modify a finished match');
      }

      await match.update(updateData);
      return match;
    } catch (error: any) {
      throw new Error(`Error updating match: ${error.message}`);
    }
  }

  public async deleteMatch(id: number): Promise<boolean> {
    try {
      const match = await Match.findByPk(id);
      if (!match) {
        return false;
      }

      // Prevent deleting matches that have started or finished
      if (match.status === 'in_progress' || match.status === 'finished') {
        throw new Error('Cannot delete a match that has started or finished');
      }

      // Check if match has statistics
      const statsCount = await Statistics.count({ where: { match_id: id } });
      if (statsCount > 0) {
        throw new Error('Cannot delete match with existing statistics');
      }

      await match.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting match: ${error.message}`);
    }
  }

  public async startMatch(id: number): Promise<Match> {
    try {
      const match = await Match.findByPk(id);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'scheduled') {
        throw new Error('Only scheduled matches can be started');
      }

      await match.update({
        status: 'in_progress',
        actual_start_time: new Date()
      });

      return match;
    } catch (error: any) {
      throw new Error(`Error starting match: ${error.message}`);
    }
  }

  public async finishMatch(id: number, team1Score: number, team2Score: number): Promise<Match> {
    try {
      const match = await Match.findByPk(id);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'in_progress') {
        throw new Error('Only matches in progress can be finished');
      }

      const winnerId = team1Score > team2Score ? match.team1_id : 
                      team2Score > team1Score ? match.team2_id : null;

      await match.update({
        status: 'finished',
        team1_score: team1Score,
        team2_score: team2Score,
        winner_id: winnerId,
        actual_end_time: new Date()
      });

      return match;
    } catch (error: any) {
      throw new Error(`Error finishing match: ${error.message}`);
    }
  }

  public async getMatchStatistics(matchId: number): Promise<Statistics[]> {
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
        ],
        order: [['player', 'team', 'name'], ['player', 'jersey_number']]
      });

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving match statistics: ${error.message}`);
    }
  }
}
