
import { Router } from 'express';
import { CourtController } from '../../controllers/championship/court.controller';
import { validateCourt, validateCourtUpdate, validateCourtReservation } from '../../validators/championship/court.validator';
import { authenticateToken } from '../../middlewares/auth.middleware';

const router = Router();
const courtController = new CourtController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route POST /api/courts
 * @desc Create a new court
 * @access Private
 */
router.post('/', validateCourt, courtController.createCourt);

/**
 * @route GET /api/courts
 * @desc Get all courts (optionally filtered by championship or status)
 * @access Private
 * @query championship_id - Optional championship ID filter
 * @query status - Optional status filter
 */
router.get('/', courtController.getAllCourts);

/**
 * @route GET /api/courts/:id
 * @desc Get court by ID
 * @access Private
 */
router.get('/:id', courtController.getCourtById);

/**
 * @route PUT /api/courts/:id
 * @desc Update court by ID
 * @access Private
 */
router.put('/:id', validateCourtUpdate, courtController.updateCourt);

/**
 * @route DELETE /api/courts/:id
 * @desc Delete court by ID
 * @access Private
 */
router.delete('/:id', courtController.deleteCourt);

/**
 * @route GET /api/courts/:id/availability
 * @desc Get court availability for a specific date
 * @access Private
 * @query date - Required date in YYYY-MM-DD format
 */
router.get('/:id/availability', courtController.getCourtAvailability);

/**
 * @route POST /api/courts/:id/reserve
 * @desc Reserve court for a match
 * @access Private
 */
router.post('/:id/reserve', validateCourtReservation, courtController.reserveCourt);

/**
 * @route GET /api/courts/:id/schedule
 * @desc Get court schedule for a date range
 * @access Private
 * @query start_date - Required start date in YYYY-MM-DD format
 * @query end_date - Required end date in YYYY-MM-DD format
 */
router.get('/:id/schedule', courtController.getCourtSchedule);

export default router;
