
import { Court } from '../../models/championship/court.model';
import { Match } from '../../models/championship/match.model';
import { Championship } from '../../models/championship/championship.model';
import { Op } from 'sequelize';

export class CourtService {
  public async createCourt(courtData: any): Promise<Court> {
    try {
      // Validate championship exists
      const championship = await Championship.findByPk(courtData.championship_id);
      if (!championship) {
        throw new Error('Championship not found');
      }

      const court = await Court.create(courtData);
      return court;
    } catch (error: any) {
      throw new Error(`Error creating court: ${error.message}`);
    }
  }

  public async getAllCourts(championshipId?: string, status?: string): Promise<Court[]> {
    try {
      const whereClause: any = {};

      if (championshipId) {
        whereClause.championship_id = championshipId;
      }

      if (status) {
        whereClause.status = status;
      }

      const courts = await Court.findAll({
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

      return courts;
    } catch (error: any) {
      throw new Error(`Error retrieving courts: ${error.message}`);
    }
  }

  public async getCourtById(id: number): Promise<Court | null> {
    try {
      const court = await Court.findByPk(id, {
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

      return court;
    } catch (error: any) {
      throw new Error(`Error retrieving court: ${error.message}`);
    }
  }

  public async updateCourt(id: number, updateData: any): Promise<Court | null> {
    try {
      const court = await Court.findByPk(id);
      if (!court) {
        return null;
      }

      await court.update(updateData);
      return court;
    } catch (error: any) {
      throw new Error(`Error updating court: ${error.message}`);
    }
  }

  public async deleteCourt(id: number): Promise<boolean> {
    try {
      const court = await Court.findByPk(id);
      if (!court) {
        return false;
      }

      // Check if court has scheduled or in-progress matches
      const activeMatches = await Match.count({
        where: {
          court_id: id,
          status: { [Op.in]: ['scheduled', 'in_progress'] }
        }
      });

      if (activeMatches > 0) {
        throw new Error('Cannot delete court with active matches');
      }

      await court.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting court: ${error.message}`);
    }
  }

  public async getCourtAvailability(courtId: number, date: string): Promise<any> {
    try {
      const court = await Court.findByPk(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.status !== 'available') {
        return {
          court_id: courtId,
          date: date,
          available: false,
          reason: `Court is ${court.status}`,
          time_slots: []
        };
      }

      // Get matches scheduled for this court on this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const matches = await Match.findAll({
        where: {
          court_id: courtId,
          scheduled_date: {
            [Op.between]: [startOfDay, endOfDay]
          },
          status: { [Op.in]: ['scheduled', 'in_progress'] }
        },
        order: [['scheduled_date', 'ASC']]
      });

      // Generate available time slots (assuming 1-hour slots from 8 AM to 10 PM)
      const timeSlots = [];
      const startHour = 8;
      const endHour = 22;

      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(date);
        slotEnd.setHours(hour + 1, 0, 0, 0);

        // Check if this slot conflicts with any match
        const hasConflict = matches.some(match => {
          const matchStart = new Date(match.scheduled_date);
          const matchEnd = new Date(matchStart.getTime() + (match.duration || 120) * 60000); // Default 2 hours
          
          return (slotStart < matchEnd && slotEnd > matchStart);
        });

        timeSlots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          available: !hasConflict
        });
      }

      return {
        court_id: courtId,
        date: date,
        available: true,
        time_slots: timeSlots,
        scheduled_matches: matches.length
      };
    } catch (error: any) {
      throw new Error(`Error retrieving court availability: ${error.message}`);
    }
  }

  public async reserveCourt(courtId: number, startTime: string, endTime: string, matchId: number): Promise<any> {
    try {
      const court = await Court.findByPk(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.status !== 'available') {
        throw new Error('Court is not available for reservation');
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check for conflicts with existing matches
      const conflictingMatches = await Match.count({
        where: {
          court_id: courtId,
          status: { [Op.in]: ['scheduled', 'in_progress'] },
          [Op.or]: [
            {
              scheduled_date: {
                [Op.between]: [start, end]
              }
            },
            {
              [Op.and]: [
                { scheduled_date: { [Op.lte]: start } },
                // Assuming matches have a duration field or default 2 hours
                { 
                  [Op.literal]: `DATE_ADD(scheduled_date, INTERVAL COALESCE(duration, 120) MINUTE) > '${start.toISOString()}'`
                }
              ]
            }
          ]
        }
      });

      if (conflictingMatches > 0) {
        throw new Error('Court is not available during the requested time slot');
      }

      // Update the match with court assignment
      const match = await Match.findByPk(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      await match.update({
        court_id: courtId,
        scheduled_date: start
      });

      return {
        message: 'Court reserved successfully',
        reservation: {
          court_id: courtId,
          match_id: matchId,
          start_time: startTime,
          end_time: endTime
        }
      };
    } catch (error: any) {
      throw new Error(`Error reserving court: ${error.message}`);
    }
  }

  public async getCourtSchedule(courtId: number, startDate: string, endDate: string): Promise<Match[]> {
    try {
      const court = await Court.findByPk(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const matches = await Match.findAll({
        where: {
          court_id: courtId,
          scheduled_date: {
            [Op.between]: [start, end]
          }
        },
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
          }
        ],
        order: [['scheduled_date', 'ASC']]
      });

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving court schedule: ${error.message}`);
    }
  }
}
