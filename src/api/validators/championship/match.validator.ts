
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateMatch = [
  body('team1_id')
    .notEmpty()
    .withMessage('Team 1 ID is required')
    .isInt({ min: 1 })
    .withMessage('Team 1 ID must be a positive integer'),

  body('team2_id')
    .notEmpty()
    .withMessage('Team 2 ID is required')
    .isInt({ min: 1 })
    .withMessage('Team 2 ID must be a positive integer'),

  body('phase_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer'),

  body('group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer'),

  body('court_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Court ID must be a positive integer'),

  body('referee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Referee ID must be a positive integer'),

  body('scheduled_date')
    .notEmpty()
    .withMessage('Scheduled date is required')
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 minutes'),

  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'])
    .withMessage('Status must be one of: scheduled, in_progress, finished, cancelled, postponed'),

  body('round')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Round must be between 1 and 50 characters')
    .trim(),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),

  // Custom validation to ensure teams are different
  body('team2_id').custom((value, { req }) => {
    if (value === req.body.team1_id) {
      throw new Error('Team 1 and Team 2 must be different');
    }
    return true;
  }),

  // Custom validation to ensure scheduled date is in the future
  body('scheduled_date').custom((value) => {
    const scheduledDate = new Date(value);
    const now = new Date();
    if (scheduledDate <= now) {
      throw new Error('Scheduled date must be in the future');
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

export const validateMatchUpdate = [
  body('team1_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team 1 ID must be a positive integer'),

  body('team2_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Team 2 ID must be a positive integer'),

  body('phase_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer'),

  body('group_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Group ID must be a positive integer'),

  body('court_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Court ID must be a positive integer'),

  body('referee_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Referee ID must be a positive integer'),

  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO 8601 date'),

  body('duration')
    .optional()
    .isInt({ min: 30, max: 300 })
    .withMessage('Duration must be between 30 and 300 minutes'),

  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'finished', 'cancelled', 'postponed'])
    .withMessage('Status must be one of: scheduled, in_progress, finished, cancelled, postponed'),

  body('round')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Round must be between 1 and 50 characters')
    .trim(),

  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim(),

  body('team1_score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Team 1 score must be a non-negative integer'),

  body('team2_score')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Team 2 score must be a non-negative integer'),

  // Custom validation to ensure teams are different if both are provided
  body('team2_id').custom((value, { req }) => {
    if (value && req.body.team1_id && value === req.body.team1_id) {
      throw new Error('Team 1 and Team 2 must be different');
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

export const validateMatchScore = [
  body('team1_score')
    .notEmpty()
    .withMessage('Team 1 score is required')
    .isInt({ min: 0 })
    .withMessage('Team 1 score must be a non-negative integer'),

  body('team2_score')
    .notEmpty()
    .withMessage('Team 2 score is required')
    .isInt({ min: 0 })
    .withMessage('Team 2 score must be a non-negative integer'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
