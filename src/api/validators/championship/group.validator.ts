
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateGroup = [
  body('name')
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Group name must be between 1 and 50 characters')
    .trim(),

  body('phase_id')
    .notEmpty()
    .withMessage('Phase ID is required')
    .isInt({ min: 1 })
    .withMessage('Phase ID must be a positive integer'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('max_teams')
    .optional()
    .isInt({ min: 2, max: 32 })
    .withMessage('Max teams must be between 2 and 32'),

  body('min_teams')
    .optional()
    .isInt({ min: 2, max: 32 })
    .withMessage('Min teams must be between 2 and 32'),

  body('qualification_spots')
    .optional()
    .isInt({ min: 0, max: 16 })
    .withMessage('Qualification spots must be between 0 and 16'),

  body('group_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Group rules cannot exceed 1000 characters')
    .trim(),

  // Custom validation to ensure min_teams <= max_teams
  body('max_teams').custom((value, { req }) => {
    if (value && req.body.min_teams && parseInt(value) < parseInt(req.body.min_teams)) {
      throw new Error('Max teams must be greater than or equal to min teams');
    }
    return true;
  }),

  // Custom validation to ensure qualification spots <= max teams
  body('qualification_spots').custom((value, { req }) => {
    if (value && req.body.max_teams && parseInt(value) > parseInt(req.body.max_teams)) {
      throw new Error('Qualification spots cannot exceed max teams');
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

export const validateGroupUpdate = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Group name must be between 1 and 50 characters')
    .trim(),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),

  body('max_teams')
    .optional()
    .isInt({ min: 2, max: 32 })
    .withMessage('Max teams must be between 2 and 32'),

  body('min_teams')
    .optional()
    .isInt({ min: 2, max: 32 })
    .withMessage('Min teams must be between 2 and 32'),

  body('qualification_spots')
    .optional()
    .isInt({ min: 0, max: 16 })
    .withMessage('Qualification spots must be between 0 and 16'),

  body('group_rules')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Group rules cannot exceed 1000 characters')
    .trim(),

  // Custom validation to ensure min_teams <= max_teams
  body('max_teams').custom((value, { req }) => {
    if (value && req.body.min_teams && parseInt(value) < parseInt(req.body.min_teams)) {
      throw new Error('Max teams must be greater than or equal to min teams');
    }
    return true;
  }),

  // Custom validation to ensure qualification spots <= max teams
  body('qualification_spots').custom((value, { req }) => {
    if (value && req.body.max_teams && parseInt(value) > parseInt(req.body.max_teams)) {
      throw new Error('Qualification spots cannot exceed max teams');
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

export const validateTeamToGroup = [
  body('team_id')
    .notEmpty()
    .withMessage('Team ID is required')
    .isInt({ min: 1 })
    .withMessage('Team ID must be a positive integer'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', HttpStatusCode.BAD_REQUEST, errors.array());
    }
    next();
  }
];
