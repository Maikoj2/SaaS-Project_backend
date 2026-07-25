import { Types } from 'mongoose';

import Team from '../../../models/mongoose/championship/team';
import Position from '../../../models/mongoose/championship/position';

import { DatabaseHelper } from '../../../utils/database.helper';
import { CustomError } from '../../../errors';

export async function validatePositionsReadyForFixture(
    tenant: string,
    championshipId: string
): Promise<void> {
    const teams = await DatabaseHelper.find(
        Team,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
            status: {
                $in: ['pending', 'active'],
            },
        },
        {
            select: ['_id', 'name'],
        }
    );

    if (!teams.length) {
        throw new CustomError(
            'No teams found for this championship',
            400,
            'PositionReadinessValidator'
        );
    }

    const positions = await DatabaseHelper.find(
        Position,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
        },
        {
            select: ['teamId', 'position'],
        }
    );

    if (positions.length !== teams.length) {
        throw new CustomError(
            'Every team must have an assigned position before generating groups',
            400,
            'PositionReadinessValidator'
        );
    }

    const teamIds = teams.map((team: any) => team._id.toString());
    const positionedTeamIds = positions.map((position: any) =>
        position.teamId.toString()
    );

    const missingTeams = teamIds.filter(
        (teamId) => !positionedTeamIds.includes(teamId)
    );

    if (missingTeams.length > 0) {
        throw new CustomError(
            'Some teams do not have an assigned position',
            400,
            'PositionReadinessValidator'
        );
    }

    const positionNumbers = positions.map((position: any) => position.position);
    const uniquePositions = new Set(positionNumbers);

    if (uniquePositions.size !== positionNumbers.length) {
        throw new CustomError(
            'There are duplicated team positions',
            400,
            'PositionReadinessValidator'
        );
    }

    const sortedPositions = [...positionNumbers].sort((a, b) => a - b);

    for (let index = 0; index < sortedPositions.length; index++) {
        const expectedPosition = index + 1;

        if (sortedPositions[index] !== expectedPosition) {
            throw new CustomError(
                `Positions must be consecutive from 1 to ${teams.length}`,
                400,
                'PositionReadinessValidator'
            );
        }
    }
}