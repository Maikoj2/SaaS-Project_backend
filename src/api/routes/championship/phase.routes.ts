
import { Router } from 'express';
import { PhaseController } from '../../controllers/championship/phase.controller';
import { validatePhase, validatePhaseUpdate } from '../../validators/championship/phase.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const phaseController = new PhaseController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/phases
 * @desc Create a new phase
 * @access Private
 */
router.post('/', validatePhase, phaseController.createPhase);

/**
 * @route GET /api/phases
 * @desc Get all phases (optionally filtered by championship)
 * @access Private
 * @query championship_id - Optional championship ID filter
 */
router.get('/', phaseController.getAllPhases);

/**
 * @route GET /api/phases/:id
 * @desc Get phase by ID
 * @access Private
 */
router.get('/:id', phaseController.getPhaseById);

/**
 * @route PUT /api/phases/:id
 * @desc Update phase by ID
 * @access Private
 */
router.put('/:id', validatePhaseUpdate, phaseController.updatePhase);

/**
 * @route DELETE /api/phases/:id
 * @desc Delete phase by ID
 * @access Private
 */
router.delete('/:id', phaseController.deletePhase);

/**
 * @route PUT /api/phases/:id/start
 * @desc Start a phase
 * @access Private
 */
router.put('/:id/start', phaseController.startPhase);

/**
 * @route PUT /api/phases/:id/finish
 * @desc Finish a phase
 * @access Private
 */
router.put('/:id/finish', phaseController.finishPhase);

/**
 * @route GET /api/phases/:id/groups
 * @desc Get all groups in a phase
 * @access Private
 */
router.get('/:id/groups', phaseController.getPhaseGroups);

/**
 * @route GET /api/phases/:id/matches
 * @desc Get all matches in a phase
 * @access Private
 */
router.get('/:id/matches', phaseController.getPhaseMatches);

export default router;
