
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateReferee = [
  body('name')
    .notEmpty()
    .withMessage('Referee name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Referee name must be between 2 and 100 characters')
    .trim(),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('championship_id')
    .notEmpty()
    .withMessage('Championship ID is required')
    .isInt({ min: 1 })
    .withMessage('Championship ID must be a positive integer'),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Phone must be a valid phone number'),

  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience years must be between 0 and 50'),

  body('certification_level')
    .optional()
    .isIn(['national', 'international', 'regional', 'local', 'beginner'])
    .withMessage('Certification level must be one of: national, international, regional, local, beginner'),

  body('specialization')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be between 2 and 100 characters')
    .trim(),

  body('availability_status')
    .optional()
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Availability status must be one of: available, busy, unavailable'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateRefereeUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Referee name must be between 2 and 100 characters')
    .trim(),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Phone must be a valid phone number'),

  body('experience_years')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience years must be between 0 and 50'),

  body('certification_level')
    .optional()
    .isIn(['national', 'international', 'regional', 'local', 'beginner'])
    .withMessage('Certification level must be one of: national, international, regional, local, beginner'),

  body('specialization')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Specialization must be between 2 and 100 characters')
    .trim(),

  body('availability_status')
    .optional()
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Availability status must be one of: available, busy, unavailable'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateRefereeAssignment = [
  body('match_id')
    .notEmpty()
    .withMessage('Match ID is required')
    .isInt({ min: 1 })
    .withMessage('Match ID must be a positive integer'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateAvailabilityStatus = [
  body('availability_status')
    .notEmpty()
    .withMessage('Availability status is required')
    .isIn(['available', 'busy', 'unavailable'])
    .withMessage('Availability status must be one of: available, busy, unavailable'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
