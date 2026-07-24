import { Types } from 'mongoose';

import Team from '../../../models/mongoose/championship/team';
import { Registration } from '../../../models/mongoose/championship/registration';

import { DatabaseHelper } from '../../../utils/database.helper';
import { CustomError } from '../../../errors';

export async function validateRegistrationsReadyForFixture(
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
            'RegistrationReadinessValidator'
        );
    }

    const registrations = await DatabaseHelper.find(
        Registration,
        tenant,
        {
            championshipId: new Types.ObjectId(championshipId),
            registrationStatus: 'confirmed',
        },
        {
            select: [
                '_id',
                'teamId',
                'registrationStatus',
                'paymentStatus',
                'paymentMethod',
            ],
        }
    );

    if (registrations.length !== teams.length) {
        throw new CustomError(
            'Every team must have a confirmed registration before generating groups',
            400,
            'RegistrationReadinessValidator'
        );
    }

    const teamIds = teams.map((team: any) => team._id.toString());

    const registeredTeamIds = registrations.map((registration: any) =>
        registration.teamId.toString()
    );

    const missingTeams = teams.filter(
        (team: any) => !registeredTeamIds.includes(team._id.toString())
    );

    if (missingTeams.length > 0) {
        throw new CustomError(
            `Some teams do not have confirmed registration: ${missingTeams
                .map((team: any) => team.name)
                .join(', ')}`,
            400,
            'RegistrationReadinessValidator'
        );
    }

    const duplicatedRegistrations = registeredTeamIds.filter(
        (teamId, index) => registeredTeamIds.indexOf(teamId) !== index
    );

    if (duplicatedRegistrations.length > 0) {
        throw new CustomError(
            'There are duplicated confirmed registrations for some teams',
            400,
            'RegistrationReadinessValidator'
        );
    }
}