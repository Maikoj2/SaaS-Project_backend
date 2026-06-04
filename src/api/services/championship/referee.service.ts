import { Referee, IRefereeDocument } from '../../models/mongoose/championship/referee';
import { Match } from '../../models/mongoose/championship/match';
import { DatabaseHelper } from '../../utils/database.helper';
import { PaginateResult } from 'mongoose';

export class RefereeService {
  public async createReferee(tenant: string, refereeData: any): Promise<IRefereeDocument> {
    // Check email uniqueness if needed, but DatabaseHelper.create handles basic creation.
    // Mongoose model has unique index on email.
    return await DatabaseHelper.create(Referee, tenant, refereeData);
  }

  public async getAllReferees(tenant: string, championshipId?: string, availabilityStatus?: string): Promise<PaginateResult<IRefereeDocument>> {
    const query: any = {};
    if (championshipId) {
      query.championshipId = championshipId;
    }
    if (availabilityStatus) {
      query.availabilityStatus = availabilityStatus;
    }

    return await DatabaseHelper.getItemsWithRelations(
      Referee,
      tenant,
      1,
      1000,
      query,
      [{ path: 'championshipId', select: 'name' }]
    );
  }

  public async getRefereeById(tenant: string, id: string): Promise<IRefereeDocument | null> {
    return await DatabaseHelper.findById(Referee, tenant, id, [{ path: 'championshipId', select: 'name' }]);
  }

  public async updateReferee(tenant: string, id: string, updateData: any): Promise<IRefereeDocument | null> {
    return await DatabaseHelper.update(Referee, tenant, id, updateData);
  }

  public async deleteReferee(tenant: string, id: string): Promise<boolean> {
    // Check for active matches
    const activeMatches = await Match.countDocuments({
      refereeId: id,
      status: { $in: ['scheduled', 'in_progress'] }
    });

    if (activeMatches > 0) {
      throw new Error('Cannot delete referee with active matches');
    }

    return await DatabaseHelper.delete(Referee, tenant, id);
  }

  public async assignRefereeToMatch(tenant: string, refereeId: string, matchId: string): Promise<any> {
    const referee = await DatabaseHelper.findById(Referee, tenant, refereeId);
    if (!referee) {
      throw new Error('Referee not found');
    }

    if (referee.availabilityStatus !== 'available') {
      throw new Error('Referee is not available');
    }

    const match = await DatabaseHelper.findById(Match, tenant, matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'scheduled') {
      throw new Error('Can only assign referees to scheduled matches');
    }

    // Check conflicts (simplified)
    if (match.startTime && match.endTime) {
      const conflictingMatches = await Match.countDocuments({
        refereeId: refereeId,
        status: { $in: ['scheduled', 'in_progress'] },
        _id: { $ne: matchId },
        $or: [
          { startTime: { $lt: match.endTime, $gte: match.startTime } },
          { endTime: { $gt: match.startTime, $lte: match.endTime } }
        ]
      });

      if (conflictingMatches > 0) {
        throw new Error('Referee has conflicting matches at this time');
      }
    }

    match.refereeId = refereeId as any;
    await match.save();

    return {
      message: 'Referee assigned to match successfully',
      assignment: {
        referee_id: refereeId,
        match_id: matchId,
        scheduled_date: match.startTime
      }
    };
  }

  public async getRefereeMatches(tenant: string, refereeId: string, status?: string): Promise<PaginateResult<any>> { // Using any for match doc for now or PaginateResult
    const query: any = { refereeId: refereeId };
    if (status) {
      query.status = status;
    }

    // Using DatabaseHelper to get matches
    return await DatabaseHelper.getItemsWithRelations(
      Match,
      tenant,
      1,
      1000,
      query,
      [
        { path: 'homeTeamId', select: 'name' },
        { path: 'awayTeamId', select: 'name' },
        { path: 'phaseId', select: 'name' },
        { path: 'courtId', select: 'name location' }
      ]
    );
  }

  public async updateAvailabilityStatus(tenant: string, refereeId: string, availabilityStatus: string): Promise<IRefereeDocument | null> {
    const referee = await DatabaseHelper.findById(Referee, tenant, refereeId);
    if (!referee) {
      throw new Error('Referee not found');
    }

    const validStatuses = ['available', 'busy', 'unavailable'];
    if (!validStatuses.includes(availabilityStatus)) {
      throw new Error('Invalid availability status');
    }

    if (availabilityStatus === 'unavailable') {
      const scheduledMatches = await Match.countDocuments({
        refereeId: refereeId,
        status: 'scheduled',
        startTime: { $gte: new Date() }
      });

      if (scheduledMatches > 0) {
        throw new Error('Cannot set referee as unavailable with scheduled matches');
      }
    }

    referee.availabilityStatus = availabilityStatus as any;
    return await referee.save();
  }
}
