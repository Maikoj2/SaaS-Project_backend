
import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { StatisticsService } from '../../services/championship/statistics.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class StatisticsController {
  private statisticsService: StatisticsService;

  constructor() {
    this.statisticsService = new StatisticsService();
  }

  public createStatistics = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const statistics = await this.statisticsService.createStatistics(req.clientAccount as string, req.body);
      successResponse(res, statistics, 'Statistics created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllStatistics = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { player_id, match_id, championship_id } = req.query;
      const statistics = await this.statisticsService.getAllStatistics(
        req.clientAccount as string, {
        playerId: player_id as string,
        matchId: match_id as string,
        championshipId: championship_id as string
      });
      successResponse(res, statistics, 'Statistics retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getStatisticsById = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.statisticsService.getStatisticsById(id);

      if (!statistics) {
        errorResponse(res, 'Statistics not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, statistics, 'Statistics retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateStatistics = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.statisticsService.updateStatistics(id, req.body);

      if (!statistics) {
        errorResponse(res, 'Statistics not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, statistics, 'Statistics updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteStatistics = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.statisticsService.deleteStatistics(id);

      if (!deleted) {
        errorResponse(res, 'Statistics not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Statistics deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPlayerStatisticsSummary = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { playerId } = req.params;
      const { championship_id } = req.query;
      const summary = await this.statisticsService.getPlayerStatisticsSummary(
        playerId,
        championship_id as string
      );
      successResponse(res, summary, 'Player statistics summary retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getMatchStatisticsSummary = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { matchId } = req.params;
      const summary = await this.statisticsService.getMatchStatisticsSummary(matchId);
      successResponse(res, summary, 'Match statistics summary retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getTopPerformers = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id, metric, limit } = req.query;
      const topPerformers = await this.statisticsService.getTopPerformers(
        req.clientAccount as string,
        championship_id as string,
        metric as string,
        parseInt(limit as string) || 10
      );
      successResponse(res, topPerformers, 'Top performers retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
