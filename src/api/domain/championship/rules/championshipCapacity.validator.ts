import { Types } from 'mongoose';

import Team from '../../../models/mongoose/championship/team';
import { CustomError } from '../../../errors';

export async function validateChampionshipTeamCapacity(
    tenant: string,
    championshipId: string | Types.ObjectId,
    maxTeams: number,
    errorSource = 'ChampionshipCapacityValidator'
): Promise<void> {
    const currentTeams = await Team.byTenant(tenant).countDocuments({
        championshipId: new Types.ObjectId(championshipId),
        status: {
            $in: ['pending', 'active'],
        },
    });

    if (currentTeams >= maxTeams) {
        throw new CustomError(
            `The championship has reached the maximum number of teams (${maxTeams})`,
            400,
            errorSource
        );
    }
}