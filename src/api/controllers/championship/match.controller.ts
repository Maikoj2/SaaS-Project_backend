
import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { MatchService } from '../../services/championship/match.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class MatchController {
  private matchService: MatchService;

  constructor() {
    this.matchService = new MatchService();
  }

  public createMatch = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const match = await this.matchService.createMatch(req.clientAccount as string, req.body);
      successResponse(res, match, 'Match created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllMatches = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id, phase_id, group_id, status, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
      const matches = await this.matchService.getAllMatches(
        req.clientAccount as string,
        Number(page),
        Number(limit),
        { [sort as string]: order === 'asc' ? 1 : -1 },
        order as string,
        {
          championshipId: championship_id as string,
          phaseId: phase_id as string,
          groupId: group_id as string,
          status: status as string
        }
      );
      successResponse(res, matches, 'Matches retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getMatchById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const match = await this.matchService.getMatchById(id);

      if (!match) {
        errorResponse(res, 'Match not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, match, 'Match retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const match = await this.matchService.updateMatch(id, req.body);

      if (!match) {
        errorResponse(res, 'Match not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, match, 'Match updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.matchService.deleteMatch(id);

      if (!deleted) {
        errorResponse(res, 'Match not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Match deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public startMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const match = await this.matchService.startMatch(id);
      successResponse(res, match, 'Match started successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public finishMatch = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { team1_score, team2_score } = req.body;
      const match = await this.matchService.finishMatch(id, team1_score, team2_score);
      successResponse(res, match, 'Match finished successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getMatchStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.matchService.getMatchStatistics(id);
      successResponse(res, statistics, 'Match statistics retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
