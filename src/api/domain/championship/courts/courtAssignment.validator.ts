import { Types } from 'mongoose';
import { CustomError } from '../../../errors';
import Match from '../../../models/mongoose/championship/match';
import { DatabaseHelper } from '../../../utils/database.helper';

export async function validateCourtsCanBeChangedForChampionship(
    tenant: string,
    championshipId: string
): Promise<void> {
    if (!Types.ObjectId.isValid(championshipId)) {
        throw new CustomError(
            'Invalid championshipId',
            400,
            'CourtAssignmentValidatorError'
        );
    }

    const matchesCount = await DatabaseHelper.count(
        Match,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
            status: {
                $in: ['scheduled', 'in_progress', 'completed'],
            },
        }
    );

    if (matchesCount > 0) {
        throw new CustomError(
            'Courts cannot be changed because the championship already has matches created',
            400,
            'CourtAssignmentValidatorError'
        );
    }
}