
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateCourt = [
  body('name')
    .notEmpty()
    .withMessage('Court name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Court name must be between 2 and 100 characters')
    .trim(),

  body('championship_id')
    .notEmpty()
    .withMessage('Championship ID is required')
    .isInt({ min: 1 })
    .withMessage('Championship ID must be a positive integer'),

  body('location')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters')
    .trim(),

  body('capacity')
    .optional()
    .isInt({ min: 10, max: 100000 })
    .withMessage('Capacity must be between 10 and 100,000'),

  body('surface_type')
    .optional()
    .isIn(['indoor', 'outdoor', 'sand', 'grass', 'synthetic'])
    .withMessage('Surface type must be one of: indoor, outdoor, sand, grass, synthetic'),

  body('status')
    .optional()
    .isIn(['available', 'maintenance', 'reserved', 'unavailable'])
    .withMessage('Status must be one of: available, maintenance, reserved, unavailable'),

  body('facilities')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Facilities description cannot exceed 500 characters')
    .trim(),

  body('contact_info')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Contact info cannot exceed 200 characters')
    .trim(),

  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a non-negative number'),

  body('booking_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Booking rules cannot exceed 1000 characters')
    .trim(),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateCourtUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Court name must be between 2 and 100 characters')
    .trim(),

  body('location')
    .optional()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters')
    .trim(),

  body('capacity')
    .optional()
    .isInt({ min: 10, max: 100000 })
    .withMessage('Capacity must be between 10 and 100,000'),

  body('surface_type')
    .optional()
    .isIn(['indoor', 'outdoor', 'sand', 'grass', 'synthetic'])
    .withMessage('Surface type must be one of: indoor, outdoor, sand, grass, synthetic'),

  body('status')
    .optional()
    .isIn(['available', 'maintenance', 'reserved', 'unavailable'])
    .withMessage('Status must be one of: available, maintenance, reserved, unavailable'),

  body('facilities')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Facilities description cannot exceed 500 characters')
    .trim(),

  body('contact_info')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Contact info cannot exceed 200 characters')
    .trim(),

  body('hourly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a non-negative number'),

  body('booking_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Booking rules cannot exceed 1000 characters')
    .trim(),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateCourtReservation = [
  body('start_time')
    .notEmpty()
    .withMessage('Start time is required')
    .isISO8601()
    .withMessage('Start time must be a valid ISO 8601 date'),

  body('end_time')
    .notEmpty()
    .withMessage('End time is required')
    .isISO8601()
    .withMessage('End time must be a valid ISO 8601 date'),

  body('match_id')
    .notEmpty()
    .withMessage('Match ID is required')
    .isInt({ min: 1 })
    .withMessage('Match ID must be a positive integer'),

  // Custom validation to ensure end time is after start time
  body('end_time').custom((value, { req }) => {
    const startTime = new Date(req.body.start_time);
    const endTime = new Date(value);
    if (endTime <= startTime) {
      throw new Error('End time must be after start time');
    }
    return true;
  }),

  // Custom validation to ensure reservation is in the future
  body('start_time').custom((value) => {
    const startTime = new Date(value);
    const now = new Date();
    if (startTime <= now) {
      throw new Error('Reservation start time must be in the future');
    }
    return true;
  }),

  // Custom validation to ensure reasonable duration (max 8 hours)
  body('end_time').custom((value, { req }) => {
    const startTime = new Date(req.body.start_time);
    const endTime = new Date(value);
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 8) {
      throw new Error('Reservation duration cannot exceed 8 hours');
    }
    return true;
  }),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
