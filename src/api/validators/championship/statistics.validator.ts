
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../../responses/response';
import { HttpStatusCode } from '../../constants/httpStatusCodes';

export const validateStatistics = [
  body('player_id')
    .notEmpty()
    .withMessage('Player ID is required')
    .isInt({ min: 1 })
    .withMessage('Player ID must be a positive integer'),

  body('match_id')
    .notEmpty()
    .withMessage('Match ID is required')
    .isInt({ min: 1 })
    .withMessage('Match ID must be a positive integer'),

  body('points_scored')
    .notEmpty()
    .withMessage('Points scored is required')
    .isInt({ min: 0 })
    .withMessage('Points scored must be a non-negative integer'),

  body('assists')
    .notEmpty()
    .withMessage('Assists is required')
    .isInt({ min: 0 })
    .withMessage('Assists must be a non-negative integer'),

  body('blocks')
    .notEmpty()
    .withMessage('Blocks is required')
    .isInt({ min: 0 })
    .withMessage('Blocks must be a non-negative integer'),

  body('serves')
    .notEmpty()
    .withMessage('Serves is required')
    .isInt({ min: 0 })
    .withMessage('Serves must be a non-negative integer'),

  body('successful_serves')
    .notEmpty()
    .withMessage('Successful serves is required')
    .isInt({ min: 0 })
    .withMessage('Successful serves must be a non-negative integer'),

  body('receptions')
    .notEmpty()
    .withMessage('Receptions is required')
    .isInt({ min: 0 })
    .withMessage('Receptions must be a non-negative integer'),

  body('successful_receptions')
    .notEmpty()
    .withMessage('Successful receptions is required')
    .isInt({ min: 0 })
    .withMessage('Successful receptions must be a non-negative integer'),

  body('attacks')
    .notEmpty()
    .withMessage('Attacks is required')
    .isInt({ min: 0 })
    .withMessage('Attacks must be a non-negative integer'),

  body('successful_attacks')
    .notEmpty()
    .withMessage('Successful attacks is required')
    .isInt({ min: 0 })
    .withMessage('Successful attacks must be a non-negative integer'),

  body('errors')
    .notEmpty()
    .withMessage('Errors is required')
    .isInt({ min: 0 })
    .withMessage('Errors must be a non-negative integer'),

  body('minutes_played')
    .notEmpty()
    .withMessage('Minutes played is required')
    .isInt({ min: 0, max: 300 })
    .withMessage('Minutes played must be between 0 and 300'),

  // Custom validations to ensure successful actions don't exceed total actions
  body('successful_serves').custom((value, { req }) => {
    if (parseInt(value) > parseInt(req.body.serves)) {
      throw new Error('Successful serves cannot exceed total serves');
    }
    return true;
  }),

  body('successful_receptions').custom((value, { req }) => {
    if (parseInt(value) > parseInt(req.body.receptions)) {
      throw new Error('Successful receptions cannot exceed total receptions');
    }
    return true;
  }),

  body('successful_attacks').custom((value, { req }) => {
    if (parseInt(value) > parseInt(req.body.attacks)) {
      throw new Error('Successful attacks cannot exceed total attacks');
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

export const validateStatisticsUpdate = [
  body('points_scored')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Points scored must be a non-negative integer'),

  body('assists')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Assists must be a non-negative integer'),

  body('blocks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Blocks must be a non-negative integer'),

  body('serves')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Serves must be a non-negative integer'),

  body('successful_serves')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Successful serves must be a non-negative integer'),

  body('receptions')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Receptions must be a non-negative integer'),

  body('successful_receptions')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Successful receptions must be a non-negative integer'),

  body('attacks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Attacks must be a non-negative integer'),

  body('successful_attacks')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Successful attacks must be a non-negative integer'),

  body('errors')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Errors must be a non-negative integer'),

  body('minutes_played')
    .optional()
    .isInt({ min: 0, max: 300 })
    .withMessage('Minutes played must be between 0 and 300'),

  // Custom validations to ensure successful actions don't exceed total actions
  body('successful_serves').custom((value, { req }) => {
    if (value !== undefined && req.body.serves !== undefined && parseInt(value) > parseInt(req.body.serves)) {
      throw new Error('Successful serves cannot exceed total serves');
    }
    return true;
  }),

  body('successful_receptions').custom((value, { req }) => {
    if (value !== undefined && req.body.receptions !== undefined && parseInt(value) > parseInt(req.body.receptions)) {
      throw new Error('Successful receptions cannot exceed total receptions');
    }
    return true;
  }),

  body('successful_attacks').custom((value, { req }) => {
    if (value !== undefined && req.body.attacks !== undefined && parseInt(value) > parseInt(req.body.attacks)) {
      throw new Error('Successful attacks cannot exceed total attacks');
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
