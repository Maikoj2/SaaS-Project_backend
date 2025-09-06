
import { Router } from 'express';
import { GroupController } from '../../controllers/championship/group.controller';
import { validateGroup, validateGroupUpdate, validateTeamToGroup } from '../../validators/championship/group.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const groupController = new GroupController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/groups
 * @desc Create a new group
 * @access Private
 */
router.post('/', validateGroup, groupController.createGroup);

/**
 * @route GET /api/groups
 * @desc Get all groups (optionally filtered by championship or phase)
 * @access Private
 * @query championship_id - Optional championship ID filter
 * @query phase_id - Optional phase ID filter
 */
router.get('/', groupController.getAllGroups);

/**
 * @route GET /api/groups/:id
 * @desc Get group by ID
 * @access Private
 */
router.get('/:id', groupController.getGroupById);

/**
 * @route PUT /api/groups/:id
 * @desc Update group by ID
 * @access Private
 */
router.put('/:id', validateGroupUpdate, groupController.updateGroup);

/**
 * @route DELETE /api/groups/:id
 * @desc Delete group by ID
 * @access Private
 */
router.delete('/:id', groupController.deleteGroup);

/**
 * @route POST /api/groups/:id/teams
 * @desc Add team to group
 * @access Private
 */
router.post('/:id/teams', validateTeamToGroup, groupController.addTeamToGroup);

/**
 * @route DELETE /api/groups/:id/teams/:teamId
 * @desc Remove team from group
 * @access Private
 */
router.delete('/:id/teams/:teamId', groupController.removeTeamFromGroup);

/**
 * @route GET /api/groups/:id/teams
 * @desc Get all teams in a group
 * @access Private
 */
router.get('/:id/teams', groupController.getGroupTeams);

/**
 * @route GET /api/groups/:id/standings
 * @desc Get group standings/table
 * @access Private
 */
router.get('/:id/standings', groupController.getGroupStandings);

export default router;
