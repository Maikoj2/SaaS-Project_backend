
import { Router } from 'express';
import { PlayerController } from '../../controllers/championship/player.controller';
import { validatePlayer, validatePlayerUpdate, validatePlayerTransfer } from '../../validators/championship/player.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const playerController = new PlayerController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/players
 * @desc Create a new player
 * @access Private
 */
router.post('/', validatePlayer, playerController.createPlayer);

/**
 * @route GET /api/players
 * @desc Get all players (optionally filtered by team or championship)
 * @access Private
 * @query team_id - Optional team ID filter
 * @query championship_id - Optional championship ID filter
 */
router.get('/', playerController.getAllPlayers);

/**
 * @route GET /api/players/:id
 * @desc Get player by ID
 * @access Private
 */
router.get('/:id', playerController.getPlayerById);

/**
 * @route PUT /api/players/:id
 * @desc Update player by ID
 * @access Private
 */
router.put('/:id', validatePlayerUpdate, playerController.updatePlayer);

/**
 * @route DELETE /api/players/:id
 * @desc Delete player by ID
 * @access Private
 */
router.delete('/:id', playerController.deletePlayer);

/**
 * @route GET /api/players/:id/statistics
 * @desc Get player statistics
 * @access Private
 * @query championship_id - Optional championship ID filter
 */
router.get('/:id/statistics', playerController.getPlayerStatistics);

/**
 * @route PUT /api/players/:id/transfer
 * @desc Transfer player to another team
 * @access Private
 */
router.put('/:id/transfer', validatePlayerTransfer, playerController.transferPlayer);

export default router;
