import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { PhaseService } from '../../services/championship/phase.service';
import { ApiResponse } from '../../responses/apiResponse';

enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

// Helper functions for responses
const successResponse = (res: Response, data: any, message?: string, statusCode: number = HttpStatusCode.OK) => {
  res.status(statusCode).json(ApiResponse.success(data, message));
};

const errorResponse = (res: Response, message: string, statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR) => {
  res.status(statusCode).json(ApiResponse.error(message));
};

export class PhaseController {
  private phaseService: PhaseService;

  constructor() {
    this.phaseService = new PhaseService();
  }

  public createPhase = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championshipId, gameFormatId, startTime } = req.body;
      const tenant = req.clientAccount as string;
      const phases = await this.phaseService.createPhases(championshipId, gameFormatId, tenant, startTime);
      successResponse(res, phases, 'Phases created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllPhases = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id } = req.query;
      const tenant = req.clientAccount as string;
      const phases = await this.phaseService.getAllPhases(championship_id as string, tenant);
      successResponse(res, phases, 'Phases retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPhaseById = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const phase = await this.phaseService.getPhaseById(id, tenant);

      if (!phase) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, phase, 'Phase retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updatePhase = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const phase = await this.phaseService.updatePhase(id, tenant, req.body);

      if (!phase) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, phase, 'Phase updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deletePhase = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const deleted = await this.phaseService.deletePhase(id, tenant);

      if (!deleted) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Phase deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public startPhase = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const phase = await this.phaseService.startPhase(id, tenant);
      successResponse(res, phase, 'Phase started successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public finishPhase = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const phase = await this.phaseService.finishPhase(id, tenant);
      successResponse(res, phase, 'Phase finished successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getPhaseGroups = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const groups = await this.phaseService.getPhaseGroups(id, tenant);
      successResponse(res, groups, 'Phase groups retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPhaseMatches = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const tenant = req.clientAccount as string;
      const matches = await this.phaseService.getPhaseMatches(id, tenant);
      successResponse(res, matches, 'Phase matches retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}