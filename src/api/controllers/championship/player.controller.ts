
import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { PlayerService } from '../../services/championship/player.service';
import { successResponse, errorResponse } from '../../responses/response';

import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class PlayerController {
  private playerService: PlayerService;

  constructor() {
    this.playerService = new PlayerService();
  }

  public createPlayer = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const player = await this.playerService.createPlayer(req.clientAccount as string, req.body);
      successResponse(res, player, 'Player created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllPlayers = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { team_id, championship_id } = req.query;
      const players = await this.playerService.getAllPlayers(
        req.clientAccount as string,
        team_id as string,
        championship_id as string
      );
      successResponse(res, players, 'Players retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPlayerById = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const player = await this.playerService.getPlayerById(id);

      if (!player) {
        errorResponse(res, 'Player not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, player, 'Player retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updatePlayer = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const player = await this.playerService.updatePlayer(id, req.body);

      if (!player) {
        errorResponse(res, 'Player not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, player, 'Player updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deletePlayer = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.playerService.deletePlayer(id);

      if (!deleted) {
        errorResponse(res, 'Player not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Player deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPlayerStatistics = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { championship_id } = req.query;
      const statistics = await this.playerService.getPlayerStatistics(
        id,
        championship_id as string
      );
      successResponse(res, statistics, 'Player statistics retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public transferPlayer = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { new_team_id } = req.body;
      const player = await this.playerService.transferPlayer(id, new_team_id);
      successResponse(res, player, 'Player transferred successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };
}
