
import { Request, Response } from 'express';
import { ICustomRequest } from '../../interfaces/ICustomrequest';
import { CourtService } from '../../services/championship/court.service';
import { successResponse, errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export class CourtController {
  private courtService: CourtService;

  constructor() {
    this.courtService = new CourtService();
  }

  public createCourt = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const court = await this.courtService.createCourt(req.clientAccount as string, req.body);
      successResponse(res, court, 'Court created successfully', HttpStatusCode.CREATED);
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getAllCourts = async (req: ICustomRequest, res: Response): Promise<void> => {
    try {
      const { championship_id, status } = req.query;
      const courts = await this.courtService.getAllCourts(
        req.clientAccount as string,
        championship_id as string,
        status as string
      );
      successResponse(res, courts, 'Courts retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getCourtById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const court = await this.courtService.getCourtById(id);

      if (!court) {
        errorResponse(res, 'Court not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, court, 'Court retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public updateCourt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const court = await this.courtService.updateCourt(id, req.body);

      if (!court) {
        errorResponse(res, 'Court not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, court, 'Court updated successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public deleteCourt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.courtService.deleteCourt(id);

      if (!deleted) {
        errorResponse(res, 'Court not found', HttpStatusCode.NOT_FOUND);
        return;
      }

      successResponse(res, null, 'Court deleted successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public getCourtAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { date } = req.query;
      const availability = await this.courtService.getCourtAvailability(
        id,
        date as string
      );
      successResponse(res, availability, 'Court availability retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };

  public reserveCourt = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { start_time, end_time, match_id } = req.body;
      const reservation = await this.courtService.reserveCourt(
        id,
        start_time,
        end_time,
        match_id
      );
      successResponse(res, reservation, 'Court reserved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.BAD_REQUEST);
    }
  };

  public getCourtSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;
      const schedule = await this.courtService.getCourtSchedule(
        id,
        start_date as string,
        end_date as string
      );
      successResponse(res, schedule, 'Court schedule retrieved successfully');
    } catch (error: any) {
      errorResponse(res, error.message, HttpStatusCode.INTERNAL_SERVER_ERROR);
    }
  };
}
