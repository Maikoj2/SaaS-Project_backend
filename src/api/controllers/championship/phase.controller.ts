
import { Request, Response } from 'express';
import { PhaseService } from '../../services/championship/phase.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class PhaseController {
  private phaseService: PhaseService;

  constructor() {
    this.phaseService = new PhaseService();
  }

  public createPhase = async (req: Request, res: Response): Promise<void> => {
    try {
      const phase = await this.phaseService.createPhase(req.body);
      successResponse(res, phase, 'Phase created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllPhases = async (req: Request, res: Response): Promise<void> => {
    try {
      const { championship_id } = req.query;
      const phases = await this.phaseService.getAllPhases(championship_id as string);
      successResponse(res, phases, 'Phases retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPhaseById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const phase = await this.phaseService.getPhaseById(parseInt(id));
      
      if (!phase) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, phase, 'Phase retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updatePhase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const phase = await this.phaseService.updatePhase(parseInt(id), req.body);
      
      if (!phase) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, phase, 'Phase updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deletePhase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.phaseService.deletePhase(parseInt(id));
      
      if (!deleted) {
        errorResponse(res, 'Phase not found', HttpStatusCode.NOT_FOUND);
        return;
      }
      
      successResponse(res, null, 'Phase deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public startPhase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const phase = await this.phaseService.startPhase(parseInt(id));
      successResponse(res, phase, 'Phase started successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public finishPhase = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const phase = await this.phaseService.finishPhase(parseInt(id));
      successResponse(res, phase, 'Phase finished successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getPhaseGroups = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const groups = await this.phaseService.getPhaseGroups(parseInt(id));
      successResponse(res, groups, 'Phase groups retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getPhaseMatches = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const matches = await this.phaseService.getPhaseMatches(parseInt(id));
      successResponse(res, matches, 'Phase matches retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
