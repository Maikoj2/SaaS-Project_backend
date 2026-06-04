import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { RefereeService } from '../../services/championship/referee.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class RefereeController {
  private refereeService: RefereeService;

  constructor() {
    this.refereeService = new RefereeService();
  }

  public createReferee = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const referee = await this.refereeService.createReferee(req.clientAccount as string, req.body);
      successResponse(res, referee, 'Referee created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllReferees = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id, availability_status } = req.query;
      const referees = await this.refereeService.getAllReferees(
        req.clientAccount as string,
        championship_id as string,
        availability_status as string
      );
      successResponse(res, referees, 'Referees retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getRefereeById = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const referee = await this.refereeService.getRefereeById(req.clientAccount as string, id);

      if (!referee) {
        errorResponse(res, 'Referee not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, referee, 'Referee retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateReferee = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const referee = await this.refereeService.updateReferee(req.clientAccount as string, id, req.body);

      if (!referee) {
        errorResponse(res, 'Referee not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, referee, 'Referee updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteReferee = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.refereeService.deleteReferee(req.clientAccount as string, id);

      if (!deleted) {
        errorResponse(res, 'Referee not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Referee deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public assignRefereeToMatch = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { match_id } = req.body;
      const assignment = await this.refereeService.assignRefereeToMatch(
        req.clientAccount as string,
        id,
        match_id
      );
      successResponse(res, assignment, 'Referee assigned to match successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getRefereeMatches = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.query;
      const matches = await this.refereeService.getRefereeMatches(
        req.clientAccount as string,
        id,
        status as string
      );
      successResponse(res, matches, 'Referee matches retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateAvailabilityStatus = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { availability_status } = req.body;
      const referee = await this.refereeService.updateAvailabilityStatus(
        req.clientAccount as string,
        id,
        availability_status
      );
      successResponse(res, referee, 'Referee availability updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };
}
