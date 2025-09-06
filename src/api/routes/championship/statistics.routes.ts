
import { Router } from 'express';
import { StatisticsController } from '../../controllers/championship/statistics.controller';
import { validateStatistics, validateStatisticsUpdate } from '../../validators/championship/statistics.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const statisticsController = new StatisticsController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/statistics
 * @desc Create new statistics record
 * @access Private
 */
router.post('/', validateStatistics, statisticsController.createStatistics);

/**
 * @route GET /api/statistics
 * @desc Get all statistics (with optional filters)
 * @access Private
 * @query player_id - Optional player ID filter
 * @query match_id - Optional match ID filter
 * @query championship_id - Optional championship ID filter
 */
router.get('/', statisticsController.getAllStatistics);

/**
 * @route GET /api/statistics/:id
 * @desc Get statistics by ID
 * @access Private
 */
router.get('/:id', statisticsController.getStatisticsById);

/**
 * @route PUT /api/statistics/:id
 * @desc Update statistics by ID
 * @access Private
 */
router.put('/:id', validateStatisticsUpdate, statisticsController.updateStatistics);

/**
 * @route DELETE /api/statistics/:id
 * @desc Delete statistics by ID
 * @access Private
 */
router.delete('/:id', statisticsController.deleteStatistics);

/**
 * @route GET /api/statistics/player/:playerId/summary
 * @desc Get player statistics summary
 * @access Private
 * @query championship_id - Optional championship ID filter
 */
router.get('/player/:playerId/summary', statisticsController.getPlayerStatisticsSummary);

/**
 * @route GET /api/statistics/match/:matchId/summary
 * @desc Get match statistics summary
 * @access Private
 */
router.get('/match/:matchId/summary', statisticsController.getMatchStatisticsSummary);

/**
 * @route GET /api/statistics/top-performers
 * @desc Get top performers by metric
 * @access Private
 * @query championship_id - Required championship ID
 * @query metric - Required metric name
 * @query limit - Optional limit (default 10)
 */
router.get('/top-performers', statisticsController.getTopPerformers);

export default router;
