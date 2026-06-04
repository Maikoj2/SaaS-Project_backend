import { Injectable } from "@decorators/di";
import { DatabaseHelper } from "../../utils/database.helper";
import Match, { IMatchDocument } from "../../models/mongoose/championship/match";
import Statistics from "../../models/mongoose/championship/statistics";
import { PaginateResult } from "mongoose";
import { MatchStatus } from "../../constants/championshipStatus.constants";
import { Team } from "../../models/mongoose/championship/team";
import { Phase } from "../../models/mongoose/championship/phase";
import { Court } from "../../models/mongoose/championship/court";

@Injectable()
export class MatchService {

  public async createMatch(tenant: string, matchData: Partial<IMatchDocument>): Promise<IMatchDocument> {
    try {
      // Validate teams exist and are different
      if (matchData.homeTeamId && matchData.awayTeamId) {
        const team1 = await Team.findById(matchData.homeTeamId);
        const team2 = await Team.findById(matchData.awayTeamId);

        if (!team1 || !team2) {
          throw new Error('One or both teams not found');
        }

        if (matchData.homeTeamId.toString() === matchData.awayTeamId.toString()) {
          throw new Error('A team cannot play against itself');
        }
      }

      // Validate phase exists
      if (matchData.phaseId) {
        const phase = await Phase.findById(matchData.phaseId);
        if (!phase) {
          throw new Error('Phase not found');
        }
      }

      // Validate court exists
      if (matchData.courtId) {
        const court = await Court.findById(matchData.courtId);
        if (!court) {
          throw new Error('Court not found');
        }
      }

      const match = await DatabaseHelper.create(Match, tenant, matchData);
      return match;
    } catch (error: any) {
      throw new Error(`Error creating match: ${error.message}`);
    }
  }

  public async getAllMatches(
    tenant: string,
    page: number,
    limit: number,
    sort: Record<string, 1 | -1>,
    order: string,
    filters: any = {}
  ): Promise<PaginateResult<IMatchDocument>> {
    try {
      const query: any = {};

      if (filters.championshipId) query.championshipId = filters.championshipId;
      if (filters.phaseId) query.phaseId = filters.phaseId;
      if (filters.groupId) query.groupId = filters.groupId;
      if (filters.courtId) query.courtId = filters.courtId;
      if (filters.status) query.status = filters.status;
      if (filters.date) {
        const date = new Date(filters.date);
        const nextDay = new Date(date);
        nextDay.setDate(date.getDate() + 1);
        query.startTime = { $gte: date, $lt: nextDay };
      }

      const matches = await DatabaseHelper.getItemsWithRelations(
        Match,
        tenant,
        query,
        { page, limit, sort, order },
        {
          nested: [
            { path: 'homeTeamId', select: 'name' },
            { path: 'awayTeamId', select: 'name' },
            { path: 'phaseId', select: 'name type' },
            { path: 'groupId', select: 'name' },
            { path: 'courtId', select: 'name location' },
            { path: 'refereeId', select: 'name' },
            { path: 'statistics' }
          ]
        }
      );

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving matches: ${error.message}`);
    }
  }

  public async getMatchById(id: string, tenant: string): Promise<IMatchDocument | null> {
    try {
      const match = await DatabaseHelper.findOneWithRelations(
        Match,
        tenant,
        { _id: id },
        {
          nested: [
            { path: 'homeTeamId', select: 'name' },
            { path: 'awayTeamId', select: 'name' },
            { path: 'phaseId', select: 'name type' },
            { path: 'groupId', select: 'name' },
            { path: 'courtId', select: 'name location' },
            { path: 'refereeId', select: 'name' },
            { path: 'statistics' }
          ]
        }
      );
      return match;
    } catch (error: any) {
      throw new Error(`Error retrieving match: ${error.message}`);
    }
  }

  public async updateMatch(id: string, updateData: any): Promise<IMatchDocument | null> {
    try {
      const match = await Match.findById(id);
      if (!match) {
        return null;
      }

      // Prevent updating finished matches
      if (match.status === MatchStatus.COMPLETED && updateData.status !== MatchStatus.COMPLETED) {
        throw new Error('Cannot modify a finished match');
      }

      const updatedMatch = await Match.findByIdAndUpdate(id, updateData, { new: true });
      return updatedMatch;
    } catch (error: any) {
      throw new Error(`Error updating match: ${error.message}`);
    }
  }

  public async deleteMatch(id: string): Promise<boolean> {
    try {
      const match = await Match.findById(id);
      if (!match) {
        return false;
      }

      // Prevent deleting matches that have started or finished
      if (match.status === MatchStatus.IN_PROGRESS || match.status === MatchStatus.COMPLETED) {
        throw new Error('Cannot delete a match that has started or finished');
      }

      // Check if match has statistics
      // Assuming Statistics model has matchId
      if (Statistics) {
        const statsCount = await Statistics.countDocuments({ matchId: id });
        if (statsCount > 0) {
          throw new Error('Cannot delete match with existing statistics');
        }
      }

      await match.delete();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting match: ${error.message}`);
    }
  }

  public async startMatch(id: string): Promise<IMatchDocument> {
    try {
      const match = await Match.findById(id);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== MatchStatus.SCHEDULED) {
        throw new Error('Only scheduled matches can be started');
      }

      match.status = MatchStatus.IN_PROGRESS;
      match.startTime = new Date();

      await match.save();

      return match;
    } catch (error: any) {
      throw new Error(`Error starting match: ${error.message}`);
    }
  }

  public async finishMatch(id: string, homeTeamScore: number, awayTeamScore: number): Promise<IMatchDocument> {
    try {
      const match = await Match.findById(id);
      if (!match) {
        throw new Error('Match not found');
      }

      if (match.status !== MatchStatus.IN_PROGRESS) {
        throw new Error('Only matches in progress can be finished');
      }

      const winnerId = homeTeamScore > awayTeamScore ? match.homeTeamId :
        awayTeamScore > homeTeamScore ? match.awayTeamId : null;

      match.status = MatchStatus.COMPLETED;
      match.score = { homeTeam: homeTeamScore, awayTeam: awayTeamScore };
      match.winnerId = winnerId as any;
      match.endTime = new Date();

      await match.save();

      return match;
    } catch (error: any) {
      throw new Error(`Error finishing match: ${error.message}`);
    }
  }

  public async getMatchStatistics(matchId: string): Promise<any[]> {
    try {
      // Assuming Statistics model exists and has matchId
      if (!Statistics) {
        return [];
      }
      const statistics = await Statistics.find({ matchId: matchId })
        .populate({
          path: 'playerId',
          select: 'name jerseyNumber',
          populate: {
            path: 'teamId',
            select: 'name'
          }
        })
        .sort({ 'playerId.name': 1 });

      return statistics;
    } catch (error: any) {
      throw new Error(`Error retrieving match statistics: ${error.message}`);
    }
  }
}
