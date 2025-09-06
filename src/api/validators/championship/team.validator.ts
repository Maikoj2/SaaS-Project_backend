
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateTeam = [
  body('name')
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters')
    .trim(),

  body('championship_id')
    .notEmpty()
    .withMessage('Championship ID is required')
    .isInt({ min: 1 })
    .withMessage('Championship ID must be a positive integer'),

  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('coach_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Coach name must be between 2 and 100 characters')
    .trim(),

  body('contact_email')
    .optional()
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),

  body('contact_phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Contact phone must be a valid phone number'),

  body('founded_year')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Founded year must be between 1800 and current year'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validateTeamUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Team name must be between 2 and 100 characters')
    .trim(),

  body('logo_url')
    .optional()
    .isURL()
    .withMessage('Logo URL must be a valid URL'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('coach_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Coach name must be between 2 and 100 characters')
    .trim(),

  body('contact_email')
    .optional()
    .isEmail()
    .withMessage('Contact email must be a valid email address')
    .normalizeEmail(),

  body('contact_phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Contact phone must be a valid phone number'),

  body('founded_year')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('Founded year must be between 1800 and current year'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
