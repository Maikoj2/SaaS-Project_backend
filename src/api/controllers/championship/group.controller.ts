
import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { GroupService } from '../../services/championship/group.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  public createGroup = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const group = await this.groupService.createGroup(req.clientAccount as string, req.body);
      successResponse(res, group, 'Group created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllGroups = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id, phase_id } = req.query;
      const groups = await this.groupService.getAllGroups(
        req.clientAccount as string,
        championship_id as string,
        phase_id as string
      );
      successResponse(res, groups, 'Groups retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getGroupById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const group = await this.groupService.getGroupById(id);

      if (!group) {
        errorResponse(res, 'Group not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, group, 'Group retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const group = await this.groupService.updateGroup(id, req.body);

      if (!group) {
        errorResponse(res, 'Group not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, group, 'Group updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.groupService.deleteGroup(id);

      if (!deleted) {
        errorResponse(res, 'Group not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Group deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public addTeamToGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { team_id } = req.body;
      const result = await this.groupService.addTeamToGroup(id, team_id);
      successResponse(res, result, 'Team added to group successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public removeTeamFromGroup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, teamId } = req.params;
      const result = await this.groupService.removeTeamFromGroup(id, teamId);
      successResponse(res, result, 'Team removed from group successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getGroupTeams = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const teams = await this.groupService.getGroupTeams(id);
      successResponse(res, teams, 'Group teams retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getGroupStandings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const standings = await this.groupService.getGroupStandings(id);
      successResponse(res, standings, 'Group standings retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
