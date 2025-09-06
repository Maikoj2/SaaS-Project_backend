
import { Router } from 'express';
import { RefereeController } from '../../controllers/championship/referee.controller';
import { validateReferee, validateRefereeUpdate, validateRefereeAssignment, validateAvailabilityStatus } from '../../validators/championship/referee.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const refereeController = new RefereeController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/referees
 * @desc Create a new referee
 * @access Private
 */
router.post('/', validateReferee, refereeController.createReferee);

/**
 * @route GET /api/referees
 * @desc Get all referees (optionally filtered by championship or availability)
 * @access Private
 * @query championship_id - Optional championship ID filter
 * @query availability_status - Optional availability status filter
 */
router.get('/', refereeController.getAllReferees);

/**
 * @route GET /api/referees/:id
 * @desc Get referee by ID
 * @access Private
 */
router.get('/:id', refereeController.getRefereeById);

/**
 * @route PUT /api/referees/:id
 * @desc Update referee by ID
 * @access Private
 */
router.put('/:id', validateRefereeUpdate, refereeController.updateReferee);

/**
 * @route DELETE /api/referees/:id
 * @desc Delete referee by ID
 * @access Private
 */
router.delete('/:id', refereeController.deleteReferee);

/**
 * @route POST /api/referees/:id/assign
 * @desc Assign referee to a match
 * @access Private
 */
router.post('/:id/assign', validateRefereeAssignment, refereeController.assignRefereeToMatch);

/**
 * @route GET /api/referees/:id/matches
 * @desc Get all matches assigned to a referee
 * @access Private
 * @query status - Optional match status filter
 */
router.get('/:id/matches', refereeController.getRefereeMatches);

/**
 * @route PUT /api/referees/:id/availability
 * @desc Update referee availability status
 * @access Private
 */
router.put('/:id/availability', validateAvailabilityStatus, refereeController.updateAvailabilityStatus);

export default router;
