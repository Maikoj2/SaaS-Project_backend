import { Court, ICourtDocument } from '../../models/mongoose/championship/court';
import { Match } from '../../models/mongoose/championship/match';
import { Championship } from '../../models/mongoose/championship/championship';
import { Team } from '../../models/mongoose/championship/team';
import { Phase } from '../../models/mongoose/championship/phase';
import { DatabaseHelper } from '../../utils/database.helper';
import { PaginateResult } from 'mongoose';

export class CourtService {
  public async createCourt(tenant: string, courtData: any): Promise<ICourtDocument> {
    try {
      // Validate championship exists if provided
      if (courtData.championshipId) {
        const championship = await Championship.findById(courtData.championshipId);
        if (!championship) {
          throw new Error('Championship not found');
        }
      }

      const court = await DatabaseHelper.create(Court, tenant, courtData);
      return court;
    } catch (error: any) {
      throw new Error(`Error creating court: ${error.message}`);
    }
  }

  public async getAllCourts(tenant: string, championshipId?: string, status?: string): Promise<PaginateResult<ICourtDocument>> {
    try {
      const query: any = {};

      if (championshipId) {
        query.championshipId = championshipId;
      }

      if (status) {
        query.status = status;
      }

      const courts = await DatabaseHelper.getItemsWithRelations(
        Court,
        tenant,
        query,
        { sort: { name: 1 } },
        {
          nested: [{ path: 'championshipId', select: 'name' }]
        }
      );

      return courts;
    } catch (error: any) {
      throw new Error(`Error retrieving courts: ${error.message}`);
    }
  }

  public async getCourtById(id: string): Promise<ICourtDocument | null> {
    try {
      const court = await Court.findById(id)
        .populate('championshipId', 'name');
      // Note: Matches are usually queried separately or virtually, but we can't easily populate them 
      // if they are not in the schema as an array. 
      // The original code included matches. We can do a separate query if needed or rely on virtuals.
      // For now, we return the court. If matches are needed, they should be fetched via MatchService.

      return court;
    } catch (error: any) {
      throw new Error(`Error retrieving court: ${error.message}`);
    }
  }

  public async updateCourt(id: string, updateData: any): Promise<ICourtDocument | null> {
    try {
      const court = await Court.findByIdAndUpdate(id, updateData, { new: true });
      return court;
    } catch (error: any) {
      throw new Error(`Error updating court: ${error.message}`);
    }
  }

  public async deleteCourt(id: string): Promise<boolean> {
    try {
      const court = await Court.findById(id);
      if (!court) {
        return false;
      }

      // Check if court has scheduled or in-progress matches
      const activeMatches = await Match.countDocuments({
        courtId: id,
        status: { $in: ['scheduled', 'in_progress'] }
      });

      if (activeMatches > 0) {
        throw new Error('Cannot delete court with active matches');
      }

      await court.delete();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting court: ${error.message}`);
    }
  }

  public async getCourtAvailability(courtId: string, date: string): Promise<any> {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.status !== 'available') {
        return {
          courtId: courtId,
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

      const matches = await Match.find({
        courtId: courtId,
        scheduledDate: { // Assuming scheduledDate exists in Match model, or use startTime
          $gte: startOfDay,
          $lte: endOfDay
        },
        status: { $in: ['scheduled', 'in_progress'] }
      }).sort({ startTime: 1 });

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
          const matchStart = new Date(match.startTime || '');
          const matchEnd = new Date(match.endTime || '');

          return (slotStart < matchEnd && slotEnd > matchStart);
        });

        timeSlots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          available: !hasConflict
        });
      }

      return {
        courtId: courtId,
        date: date,
        available: true,
        time_slots: timeSlots,
        scheduled_matches: matches.length
      };
    } catch (error: any) {
      throw new Error(`Error retrieving court availability: ${error.message}`);
    }
  }

  public async reserveCourt(courtId: string, startTime: string, endTime: string, matchId: string): Promise<any> {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      if (court.status !== 'available') {
        throw new Error('Court is not available for reservation');
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      // Check for conflicts with existing matches
      const conflictingMatches = await Match.countDocuments({
        courtId: courtId,
        status: { $in: ['scheduled', 'in_progress'] },
        $or: [
          { startTime: { $lt: end, $gte: start } },
          { endTime: { $gt: start, $lte: end } }
        ]
      });

      if (conflictingMatches > 0) {
        throw new Error('Court is not available during the requested time slot');
      }

      // Update the match with court assignment
      const match = await Match.findById(matchId);
      if (!match) {
        throw new Error('Match not found');
      }

      match.courtId = courtId as any;
      match.startTime = start;
      match.endTime = end;
      await match.save();

      return {
        message: 'Court reserved successfully',
        reservation: {
          courtId: courtId,
          matchId: matchId,
          startTime: startTime,
          endTime: endTime
        }
      };
    } catch (error: any) {
      throw new Error(`Error reserving court: ${error.message}`);
    }
  }

  public async getCourtSchedule(courtId: string, startDate: string, endDate: string): Promise<any[]> {
    try {
      const court = await Court.findById(courtId);
      if (!court) {
        throw new Error('Court not found');
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      const matches = await Match.find({
        courtId: courtId,
        startTime: {
          $gte: start,
          $lte: end
        }
      })
        .populate('homeTeamId', 'name')
        .populate('awayTeamId', 'name')
        .populate('phaseId', 'name')
        .sort({ startTime: 1 });

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving court schedule: ${error.message}`);
    }
  }
}
