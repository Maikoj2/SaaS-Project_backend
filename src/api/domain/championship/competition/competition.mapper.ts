import { Types } from 'mongoose';
import { IPositionDocument } from '../../../models/mongoose/championship/position';
import { ITeamDocument } from '../../../models/mongoose/championship/team';
import {
    CompetitionDistributionMap,
    CompetitionGroup,
    CompetitionTeam,
} from './competition.types';

type PopulatedPosition = Omit<IPositionDocument, 'teamId'> & {
    teamId: ITeamDocument;
};

export function mapPositionsToCompetitionTeams(
    positions: PopulatedPosition[]
): CompetitionTeam[] {
    return positions.map((position) => ({
        id: String(position.teamId._id),
        name: position.teamId.name,
        seed: position.position,
    }));
}

export function mapCompetitionGroupsToDistributionMap(
    groups: CompetitionGroup[]
): CompetitionDistributionMap {
    const distribution: CompetitionDistributionMap = {};

    groups.forEach((group) => {
        distribution[group.name] = group.teams.map((team) => ({
            teamId: team.id,
            position: team.seed ?? 0,
            group: group.name,
        }));
    });

    return distribution;
}

export function mapDistributionMapToMongoDistribution(
    distribution: CompetitionDistributionMap
) {
    return Object.fromEntries(
        Object.entries(distribution).map(([groupName, teams]) => [
            groupName,
            teams.map((team) => ({
                teamId: new Types.ObjectId(team.teamId),
                position: team.position,
                group: team.group,
            })),
        ])
    );
}