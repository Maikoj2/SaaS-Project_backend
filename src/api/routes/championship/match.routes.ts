
import { Router } from 'express';
import { MatchController } from '../../controllers/championship/match.controller';
import { validateMatch, validateMatchUpdate, validateMatchScore } from '../../validators/championship/match.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const matchController = new MatchController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/matches
 * @desc Create a new match
 * @access Private
 */
router.post('/', validateMatch, matchController.createMatch);

/**
 * @route GET /api/matches
 * @desc Get all matches (with optional filters)
 * @access Private
 * @query championship_id - Optional championship ID filter
 * @query phase_id - Optional phase ID filter
 * @query group_id - Optional group ID filter
 * @query status - Optional status filter
 */
router.get('/', matchController.getAllMatches);

/**
 * @route GET /api/matches/:id
 * @desc Get match by ID
 * @access Private
 */
router.get('/:id', matchController.getMatchById);

/**
 * @route PUT /api/matches/:id
 * @desc Update match by ID
 * @access Private
 */
router.put('/:id', validateMatchUpdate, matchController.updateMatch);

/**
 * @route DELETE /api/matches/:id
 * @desc Delete match by ID
 * @access Private
 */
router.delete('/:id', matchController.deleteMatch);

/**
 * @route PUT /api/matches/:id/start
 * @desc Start a match
 * @access Private
 */
router.put('/:id/start', matchController.startMatch);

/**
 * @route PUT /api/matches/:id/finish
 * @desc Finish a match with scores
 * @access Private
 */
router.put('/:id/finish', validateMatchScore, matchController.finishMatch);

/**
 * @route GET /api/matches/:id/statistics
 * @desc Get match statistics
 * @access Private
 */
router.get('/:id/statistics', matchController.getMatchStatistics);

export default router;
