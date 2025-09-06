
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validatePlayer = [
  body('name')
    .notEmpty()
    .withMessage('Player name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Player name must be between 2 and 100 characters')
    .trim(),

  body('team_id')
    .notEmpty()
    .withMessage('Team ID is required')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  body('jersey_number')
    .notEmpty()
    .withMessage('Jersey number is required')
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),

  body('position')
    .notEmpty()
    .withMessage('Position is required')
    .isIn(['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'defensive_specialist'])
    .withMessage('Position must be one of: setter, outside_hitter, middle_blocker, opposite, libero, defensive_specialist'),

  body('age')
    .optional()
    .isInt({ min: 12, max: 60 })
    .withMessage('Age must be between 12 and 60'),

  body('height')
    .optional()
    .isFloat({ min: 1.0, max: 2.5 })
    .withMessage('Height must be between 1.0 and 2.5 meters'),

  body('weight')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Weight must be between 30 and 200 kg'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Phone must be a valid phone number'),

  body('nationality')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nationality must be between 2 and 50 characters')
    .trim(),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date in ISO format'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validatePlayerUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Player name must be between 2 and 100 characters')
    .trim(),

  body('jersey_number')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Jersey number must be between 1 and 99'),

  body('position')
    .optional()
    .isIn(['setter', 'outside_hitter', 'middle_blocker', 'opposite', 'libero', 'defensive_specialist'])
    .withMessage('Position must be one of: setter, outside_hitter, middle_blocker, opposite, libero, defensive_specialist'),

  body('age')
    .optional()
    .isInt({ min: 12, max: 60 })
    .withMessage('Age must be between 12 and 60'),

  body('height')
    .optional()
    .isFloat({ min: 1.0, max: 2.5 })
    .withMessage('Height must be between 1.0 and 2.5 meters'),

  body('weight')
    .optional()
    .isFloat({ min: 30, max: 200 })
    .withMessage('Weight must be between 30 and 200 kg'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Phone must be a valid phone number'),

  body('nationality')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Nationality must be between 2 and 50 characters')
    .trim(),

  body('date_of_birth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date in ISO format'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];

export const validatePlayerTransfer = [
  body('new_team_id')
    .notEmpty()
    .withMessage('New team ID is required')
    .isInt({ min: 1 })
    .withMessage('New team ID must be a positive integer'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
