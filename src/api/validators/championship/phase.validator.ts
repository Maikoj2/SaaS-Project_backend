
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validatePhase = [
  body('name')
    .notEmpty()
    .withMessage('Phase name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Phase name must be between 2 and 100 characters')
    .trim(),

  body('championship_id')
    .notEmpty()
    .withMessage('Championship ID is required')
    .isInt({ min: 1 })
    .withMessage('Championship ID must be a positive integer'),

  body('type')
    .notEmpty()
    .withMessage('Phase type is required')
    .isIn(['group_stage', 'knockout', 'round_robin', 'swiss', 'elimination'])
    .withMessage('Phase type must be one of: group_stage, knockout, round_robin, swiss, elimination'),

  body('phase_order')
    .notEmpty()
    .withMessage('Phase order is required')
    .isInt({ min: 1 })
    .withMessage('Phase order must be a positive integer'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'finished', 'cancelled'])
    .withMessage('Status must be one of: scheduled, in_progress, finished, cancelled'),

  body('max_teams')
    .optional()
    .isInt({ min: 2, max: 128 })
    .withMessage('Max teams must be between 2 and 128'),

  body('qualification_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Qualification rules cannot exceed 1000 characters')
    .trim(),

  // Custom validation to ensure end date is after start date
  body('end_date').custom((value, { req }) => {
    if (value && req.body.start_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
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

export const validatePhaseUpdate = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Phase name must be between 2 and 100 characters')
    .trim(),

  body('type')
    .optional()
    .isIn(['group_stage', 'knockout', 'round_robin', 'swiss', 'elimination'])
    .withMessage('Phase type must be one of: group_stage, knockout, round_robin, swiss, elimination'),

  body('phase_order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Phase order must be a positive integer'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'finished', 'cancelled'])
    .withMessage('Status must be one of: scheduled, in_progress, finished, cancelled'),

  body('max_teams')
    .optional()
    .isInt({ min: 2, max: 128 })
    .withMessage('Max teams must be between 2 and 128'),

  body('qualification_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Qualification rules cannot exceed 1000 characters')
    .trim(),

  // Custom validation to ensure end date is after start date
  body('end_date').custom((value, { req }) => {
    if (value && req.body.start_date) {
      const startDate = new Date(req.body.start_date);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
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
