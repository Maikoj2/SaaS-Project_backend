
import { Referee } from '../../models/championship/referee.model';
import { Match } from '../../models/championship/match.model';
import { Championship } from '../../models/championship/championship.model';
import { Team } from '../../models/championship/team.model';
import { Op } from 'sequelize';

export class RefereeService {
  public async createReferee(refereeData: any): Promise<Referee> {
    try {
      // Validate championship exists
      const championship = await Championship.findByPk(refereeData.championship_id);
      if (!championship) {
        throw new Error('Championship not found');
      }

      // Check email uniqueness
      const existingReferee = await Referee.findOne({
        where: { email: refereeData.email }
      });

      if (existingReferee) {
        throw new Error('Email already exists');
      }

      const referee = await Referee.create(refereeData);
      return referee;
    } catch (error: any) {
      throw new Error(`Error creating referee: ${error.message}`);
    }
  }

  public async getAllReferees(championshipId?: string, availabilityStatus?: string): Promise<Referee[]> {
    try {
      const whereClause: any = {};

      if (championshipId) {
        whereClause.championship_id = championshipId;
      }

      if (availabilityStatus) {
        whereClause.availability_status = availabilityStatus;
      }

      const referees = await Referee.findAll({
        where: whereClause,
        include: [
          {
            model: Championship,
            as: 'championship',
            attributes: ['id', 'name']
          }
        ],
        order: [['name', 'ASC']]
      });

      return referees;
    } catch (error: any) {
      throw new Error(`Error retrieving referees: ${error.message}`);
    }
  }

  public async getRefereeById(id: number): Promise<Referee | null> {
    try {
      const referee = await Referee.findByPk(id, {
        include: [
          {
            model: Championship,
            as: 'championship',
            attributes: ['id', 'name']
          },
          {
            model: Match,
            as: 'matches',
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

      return referee;
    } catch (error: any) {
      throw new Error(`Error retrieving referee: ${error.message}`);
    }
  }

  public async updateReferee(id: number, updateData: any): Promise<Referee | null> {
    try {
      const referee = await Referee.findByPk(id);
      if (!referee) {
        return null;
      }

      // If updating email, check uniqueness
      if (updateData.email && updateData.email !== referee.email) {
        const existingReferee = await Referee.findOne({
          where: {
            email: updateData.email,
            id: { [Op.ne]: id }
          }
        });

        if (existingReferee) {
          throw new Error('Email already exists');
        }
      }

      await referee.update(updateData);
      return referee;
    } catch (error: any) {
      throw new Error(`Error updating referee: ${error.message}`);
    }
  }

  public async deleteReferee(id: number): Promise<boolean> {
    try {
      const referee = await Referee.findByPk(id);
      if (!referee) {
        return false;
      }

      // Check if referee has scheduled or in-progress matches
      const activeMatches = await Match.count({
        where: {
          referee_id: id,
          status: { [Op.in]: ['scheduled', 'in_progress'] }
        }
      });

      if (activeMatches > 0) {
        throw new Error('Cannot delete referee with active matches');
      }

      await referee.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting referee: ${error.message}`);
    }
  }

  public async assignRefereeToMatch(refereeId: number, matchId: number): Promise<any> {
    try {
      const referee = await Referee.findByPk(refereeId);
      if (!referee) {
        throw new Error('Referee not found');
      }

      if (referee.availability_status !== 'available') {
        throw new Error('Referee is not available');
      }

      const match = await Match.findByPk(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== 'scheduled') {
        throw new Error('Can only assign referees to scheduled matches');
      }

      // Check if referee has conflicting matches
      const conflictingMatches = await Match.count({
        where: {
          referee_id: refereeId,
          scheduled_date: match.scheduled_date,
          status: { [Op.in]: ['scheduled', 'in_progress'] },
          id: { [Op.ne]: matchId }
        }
      });

      if (conflictingMatches > 0) {
        throw new Error('Referee has conflicting matches at this time');
      }

      await match.update({ referee_id: refereeId });

      return {
        message: 'Referee assigned to match successfully',
        assignment: {
          referee_id: refereeId,
          match_id: matchId,
          scheduled_date: match.scheduled_date
        }
      };
    } catch (error: any) {
      throw new Error(`Error assigning referee to match: ${error.message}`);
    }
  }

  public async getRefereeMatches(refereeId: number, status?: string): Promise<Match[]> {
    try {
      const referee = await Referee.findByPk(refereeId);
      if (!referee) {
        throw new Error('Referee not found');
      }

      const whereClause: any = { referee_id: refereeId };
      if (status) {
        whereClause.status = status;
      }

      const matches = await Match.findAll({
        where: whereClause,
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
            attributes: ['id', 'name']
          },
          {
            model: Court,
            as: 'court',
            attributes: ['id', 'name', 'location']
          }
        ],
        order: [['scheduled_date', 'ASC']]
      });

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving referee matches: ${error.message}`);
    }
  }

  public async updateAvailabilityStatus(refereeId: number, availabilityStatus: string): Promise<Referee> {
    try {
      const referee = await Referee.findByPk(refereeId);
      if (!referee) {
        throw new Error('Referee not found');
      }

      const validStatuses = ['available', 'busy', 'unavailable'];
      if (!validStatuses.includes(availabilityStatus)) {
        throw new Error('Invalid availability status');
      }

      // If setting to unavailable, check for scheduled matches
      if (availabilityStatus === 'unavailable') {
        const scheduledMatches = await Match.count({
          where: {
            referee_id: refereeId,
            status: 'scheduled',
            scheduled_date: { [Op.gte]: new Date() }
          }
        });

        if (scheduledMatches > 0) {
          throw new Error('Cannot set referee as unavailable with scheduled matches');
        }
      }

      await referee.update({ availability_status: availabilityStatus });
      return referee;
    } catch (error: any) {
      throw new Error(`Error updating referee availability: ${error.message}`);
    }
  }
}
