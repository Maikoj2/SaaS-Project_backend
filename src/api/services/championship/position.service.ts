import { DatabaseHelper } from '../../utils/database.helper';
import { IRegistrationDocument, Registration } from '../../models/mongoose/championship/registration';
import { Logger } from '../../config/logger/WinstonLogger';
import { CustomError } from '../../errors';
import { Document, PaginateResult, Types } from 'mongoose';
import Position, { IPositionDocument } from '../../models/mongoose/championship/position';
import { validateRegistrationsReadyForFixture } from '../../domain/championship/teams/registrationReadiness.validator';
import { validatePositionsReadyForFixture } from '../../domain/championship/teams/positionReadiness.validator';

export class PositionService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public autoAssignPositions = async (tenant: string, championshipId: string): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            await validateRegistrationsReadyForFixture(
                tenant,
                championshipId
            );

            const registrations = await this.getTotalRegistrations(
                tenant,
                championshipId
            );

            this.logger.info(`Registrations found: ${registrations.docs.length}`);

            if (!registrations.docs.length) {
                throw new CustomError(
                    'No confirmed registrations found',
                    400,
                    'PositionServiceError'
                );
            }

            const positions = registrations.docs.map((registration, index) => ({
                teamId: registration.teamId.toString(),
                position: index + 1,
            }));

            this.validatePositionPayload(positions);


            // Asignar posiciones automáticamente
            const positionDocs = registrations.docs.map((registration: any, index: number) => ({
                championshipId: championshipId as unknown as Types.ObjectId,
                teamId: registration.teamId as unknown as Types.ObjectId,
                position: index + 1,
                assignedAutomatically: true
            }));
            this.logger.info('Positions to be inserted:', positionDocs);

            const result = await this.replaceChampionshipPositions(
                tenant,
                championshipId,
                positionDocs
            );

            this.logger.info(
                `Positions assigned automatically for championship ${championshipId}`
            );
            this.logger.info(`Positions assigned automatically for championship ${championshipId}`);
            return result;
        } catch (error) {
            this.logger.error('Error auto-assigning positions:', error);
            throw new CustomError(
                error instanceof Error ? error.message : 'Error auto-assigning positions',
                500,
                'PositionServiceError'
            );
        }
    }

    public manualAssignPositions = async (tenant: string, championshipId: string, positions: Array<{ teamId: string, position: number }>): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            await validateRegistrationsReadyForFixture(
                tenant,
                championshipId
            );

            this.validatePositionPayload(positions);

            await this.validatePositionTeamsAreConfirmed(
                tenant,
                championshipId,
                positions
            );

            // Validar y guardar posiciones manualmente
            const positionDocs = positions.map(pos => ({
                championshipId: championshipId as unknown as Types.ObjectId,
                teamId: pos.teamId as unknown as Types.ObjectId,
                position: pos.position,
                assignedAutomatically: false
            }));

            // Guardar nuevas posiciones
            const result = await this.replaceChampionshipPositions(
                tenant,
                championshipId,
                positionDocs
            );

            this.logger.info(`Positions assigned manually for championship ${championshipId}`);
            return result;
        } catch (error) {
            this.logger.error('Error manually assigning positions:', error);
            throw new CustomError('Error manually assigning positions', 500, 'PositionServiceError');
        }
    }

    public assignPositionByRegistrationId = async (tenant: string, registrationId: string, position: number): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            // Buscar el registro por ID
            const registration = await DatabaseHelper.findOne(Registration, tenant, { _id: new Types.ObjectId(registrationId) });

            if (!registration) {
                throw new CustomError('Registration not found', 404, 'PositionServiceError');
            }
            // Obtener el número total de registros confirmados para el campeonato
            const totalRegistrations = await DatabaseHelper.count(Registration, tenant, { championshipId: registration.championshipId, registrationStatus: 'confirmed' });

            // Validar que la posición esté dentro del rango
            if (position > totalRegistrations) {
                throw new CustomError(`Position must be between 1 and ${totalRegistrations}`, 400, 'PositionServiceError');
            }
            // Verificar si la posición ya está ocupada
            const existingPosition = await DatabaseHelper.findOne(Position, tenant, { championshipId: registration.championshipId, position });

            if (existingPosition) {
                throw new CustomError(`Position ${position} is already occupied`, 400, 'PositionServiceError');
            }

            // Crear el documento de posición
            const positionDoc = {
                championshipId: registration.championshipId as unknown as Types.ObjectId,
                teamId: registration.teamId as unknown as Types.ObjectId,
                position,
                assignedAutomatically: false,
            };

            const result = await DatabaseHelper.findOneAndUpdate(
                Position,
                tenant,
                {
                    championshipId: registration.championshipId,
                    teamId: registration.teamId,
                },
                {
                    $set: positionDoc,
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                }
            );

            if (!result) {
                throw new CustomError(
                    'Error assigning position',
                    500,
                    'PositionServiceError'
                );
            }

            this.logger.info(
                `Position ${position} assigned to team ${registration.teamId} for championship ${registration.championshipId}`
            );

            return [result] as unknown as Document<IPositionDocument, any, any>[];
        } catch (error) {
            this.logger.error('Error assigning position by registration ID:', error);
            throw new CustomError('Error assigning position', 500, 'PositionServiceError');
        }
    }

    public assignRandomPositions = async (tenant: string, championshipId: string): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            await validateRegistrationsReadyForFixture(
                tenant,
                championshipId
            );

            const registrations = await this.getTotalRegistrations(
                tenant,
                championshipId
            );

            if (!registrations.docs.length) {
                throw new CustomError(
                    'No confirmed registrations found',
                    400,
                    'PositionServiceError'
                );
            }

            const uniquePositions = new Set<number>();
            // Generar números aleatorios únicos
            while (uniquePositions.size < registrations.totalDocs) {
                const randomPosition = Math.floor(Math.random() * registrations.totalDocs) + 1;
                uniquePositions.add(randomPosition);
            }

            // Convertir el conjunto a un array
            const positionsArray = Array.from(uniquePositions);

            // Generar posiciones aleatorias
            const positionDocs = registrations.docs.map((registration: any, index: number) => ({
                championshipId: registration.championshipId as unknown as Types.ObjectId,
                teamId: registration.teamId as unknown as Types.ObjectId,
                position: positionsArray[index],
                assignedAutomatically: true
            }));

            const result = await this.replaceChampionshipPositions(
                tenant,
                championshipId,
                positionDocs
            );
            return result;
        } catch (error) {
            this.logger.error('Error assigning random positions:', error);
            throw new CustomError('Error assigning random positions', 500, 'PositionServiceError');
        }
    }

    public getPositionsByChampionshipId = async (tenant: string, championshipId: string, limit: number = 50, page: number = 0, sort: string = 'position'): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            const positions = await DatabaseHelper.getItemsWithRelations(
                Position,
                tenant,
                { championshipId: new Types.ObjectId(championshipId) },
                { sort: { [sort]: 1 }, limit: limit, page, select: ['championshipId', 'teamId', 'position'] },
                {
                    basic: ['championshipId', 'teamId'],
                    nested: [
                        { path: 'teamId', select: 'name' },
                        { path: 'championshipId', select: 'name' }
                    ]
                });
            if (!positions) {
                throw new CustomError('No positions found', 404, 'PositionServiceError');
            }
            return positions as unknown as Document<IPositionDocument, any, any>[];
        } catch (error) {
            this.logger.error('Error getting positions by championship ID:', error);
            throw new CustomError('Error getting positions by championship ID', 500, 'PositionServiceError');
        }
    }

    private getTotalRegistrations = async (tenant: string, championshipId: string): Promise<PaginateResult<IRegistrationDocument>> => {
        try {

            const totalRegistrations = await DatabaseHelper.count(Registration, tenant, { championshipId, registrationStatus: 'confirmed' });
            const registrations = await DatabaseHelper.getItems(
                Registration,
                tenant,
                { championshipId, registrationStatus: 'confirmed' },
                { sort: { paymentDate: 1 }, limit: totalRegistrations }
            );


            return registrations;
        } catch (error) {
            this.logger.error('Error getting total registrations:', error);
            throw new CustomError('Error getting total registrations', 500, 'PositionServiceError');
        }
    }

    private validatePositionPayload(
        positions: Array<{ teamId: string; position: number }>
    ): void {
        if (!positions.length) {
            throw new CustomError(
                'Positions list cannot be empty',
                400,
                'PositionServiceError'
            );
        }

        const teamIds = positions.map((item) => item.teamId);
        const uniqueTeamIds = new Set(teamIds);

        if (uniqueTeamIds.size !== teamIds.length) {
            throw new CustomError(
                'Duplicated teamId in positions',
                400,
                'PositionServiceError'
            );
        }

        const positionNumbers = positions.map((item) => Number(item.position));
        const uniquePositions = new Set(positionNumbers);

        if (uniquePositions.size !== positionNumbers.length) {
            throw new CustomError(
                'Duplicated position number',
                400,
                'PositionServiceError'
            );
        }

        const sortedPositions = [...positionNumbers].sort((a, b) => a - b);

        for (let index = 0; index < sortedPositions.length; index++) {
            const expectedPosition = index + 1;

            if (sortedPositions[index] !== expectedPosition) {
                throw new CustomError(
                    `Positions must be consecutive from 1 to ${positions.length}`,
                    400,
                    'PositionServiceError'
                );
            }
        }
    }

    private async validatePositionTeamsAreConfirmed(
        tenant: string,
        championshipId: string,
        positions: Array<{ teamId: string; position: number }>
    ): Promise<void> {
        const registrations = await this.getTotalRegistrations(
            tenant,
            championshipId
        );

        const confirmedTeamIds = registrations.docs.map((registration: any) =>
            registration.teamId.toString()
        );

        const positionTeamIds = positions.map((item) => item.teamId.toString());

        const missingConfirmedTeams = confirmedTeamIds.filter(
            (teamId) => !positionTeamIds.includes(teamId)
        );

        if (missingConfirmedTeams.length > 0) {
            throw new CustomError(
                'All confirmed teams must have an assigned position',
                400,
                'PositionServiceError'
            );
        }

        const invalidTeams = positionTeamIds.filter(
            (teamId) => !confirmedTeamIds.includes(teamId)
        );

        if (invalidTeams.length > 0) {
            throw new CustomError(
                'Positions contain teams without confirmed registration',
                400,
                'PositionServiceError'
            );
        }
    }

    private async replaceChampionshipPositions(
        tenant: string,
        championshipId: string,
        positionDocs: Array<{
            championshipId: Types.ObjectId;
            teamId: Types.ObjectId;
            position: number;
            assignedAutomatically: boolean;
        }>
    ): Promise<Document<IPositionDocument, any, any>[]> {
        await DatabaseHelper.deleteMany(
            Position,
            tenant,
            {
                championshipId: new Types.ObjectId(championshipId),
            }
        );

        const result = await DatabaseHelper.insertDocumentsConcurrently(
            Position,
            tenant,
            positionDocs
        );

        if (result.length !== positionDocs.length) {
            throw new CustomError(
                'Some positions could not be inserted',
                500,
                'PositionServiceError'
            );
        }

        return result;
    }
}