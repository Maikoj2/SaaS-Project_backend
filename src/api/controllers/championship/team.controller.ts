
import { Request, Response } from 'express';
import { TeamService } from '../../services/championship/team.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class TeamController {
  private teamService: TeamService;

  constructor() {
    this.teamService = new TeamService();
  }

  public createTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const team = await this.teamService.createTeam(req.body);
      successResponse(res, team, 'Team created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllTeams = async (req: Request, res: Response): Promise<void> => {
    try {
      const { championship_id } = req.query;
      const teams = await this.teamService.getAllTeams(championship_id as string);
      successResponse(res, teams, 'Teams retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getTeamById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const team = await this.teamService.getTeamById(parseInt(id));
      
      if (!team) {
        errorResponse(res, 'Team not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, team, 'Team retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const team = await this.teamService.updateTeam(parseInt(id), req.body);
      
      if (!team) {
        errorResponse(res, 'Team not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, team, 'Team updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteTeam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.teamService.deleteTeam(parseInt(id));
      
      if (!deleted) {
        errorResponse(res, 'Team not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, null, 'Team deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getTeamPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const players = await this.teamService.getTeamPlayers(parseInt(id));
      successResponse(res, players, 'Team players retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getTeamStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const statistics = await this.teamService.getTeamStatistics(parseInt(id));
      successResponse(res, statistics, 'Team statistics retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
