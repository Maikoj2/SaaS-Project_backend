
import { Router } from 'express';
import { TeamController } from '../../controllers/championship/team.controller';
import { validateTeam, validateTeamUpdate } from '../../validators/championship/team.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const teamController = new TeamController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/teams
 * @desc Create a new team
 * @access Private
 */
router.post('/', validateTeam, teamController.createTeam);

/**
 * @route GET /api/teams
 * @desc Get all teams (optionally filtered by championship)
 * @access Private
 * @query championship_id - Optional championship ID filter
 */
router.get('/', teamController.getAllTeams);

/**
 * @route GET /api/teams/:id
 * @desc Get team by ID
 * @access Private
 */
router.get('/:id', teamController.getTeamById);

/**
 * @route PUT /api/teams/:id
 * @desc Update team by ID
 * @access Private
 */
router.put('/:id', validateTeamUpdate, teamController.updateTeam);

/**
 * @route DELETE /api/teams/:id
 * @desc Delete team by ID
 * @access Private
 */
router.delete('/:id', teamController.deleteTeam);

/**
 * @route GET /api/teams/:id/players
 * @desc Get all players of a team
 * @access Private
 */
router.get('/:id/players', teamController.getTeamPlayers);

/**
 * @route GET /api/teams/:id/statistics
 * @desc Get team statistics
 * @access Private
 */
router.get('/:id/statistics', teamController.getTeamStatistics);

export default router;
