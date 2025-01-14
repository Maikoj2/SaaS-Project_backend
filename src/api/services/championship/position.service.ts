// src/api/services/championship/position.service.ts
import { DatabaseHelper } from '../../utils/database.helper';

import { IRegistrationDocument, Registration } from '../../models/mongoose/championship/registration';
import { Logger } from '../../config/logger/WinstonLogger';
import { CustomError } from '../../errors';
import Position, { IPositionDocument } from '../../models/mongoose/championship/InitialPosition';
import { Document, Types } from 'mongoose';
import { PaginateResult } from 'mongoose';

export class PositionService {
    private logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public autoAssignPositions = async (tenant: string, championshipId: string): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            // Obtener registros confirmados ordenados por fecha de registro
            // Obtener el número total de registros confirmados para el campeonato
            const registrations = await this.getTotalRegistrations(tenant, championshipId);
            this.logger.info(`Registrations found: ${registrations.docs.length}`);


            // Asignar posiciones automáticamente
            const positions = registrations.docs.map((registration, index) => ({
                championshipId: championshipId as unknown as Types.ObjectId,
                teamId: registration.teamId as unknown as Types.ObjectId,
                position: index + 1,
                assignedAutomatically: true
            }));
            this.logger.info('Positions to be inserted:', positions);


            // Guardar posiciones en la base de datos
            const result = await DatabaseHelper.insertDocumentsConcurrently(Position, tenant, positions);

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
            // Validar y guardar posiciones manualmente
            const positionDocs = positions.map(pos => ({
                championshipId: championshipId as unknown as Types.ObjectId,
                teamId: pos.teamId as unknown as Types.ObjectId,
                position: pos.position,
                assignedAutomatically: false
            }));

            // Eliminar posiciones existentes para el campeonato
            await DatabaseHelper.deleteMany(Position, tenant, { championshipId });

            // Guardar nuevas posiciones
            const result = await DatabaseHelper.insertDocumentsConcurrently(Position, tenant, positionDocs);

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
                position: position,
                assignedAutomatically: false
            };

            // Eliminar cualquier posición existente para el equipo en este campeonato
            await DatabaseHelper.deleteMany(Position, tenant, { championshipId: registration.championshipId, teamId: registration.teamId });

            // Guardar la nueva posición
            const result = await DatabaseHelper.insertDocumentsConcurrently(Position, tenant, [positionDoc]);

            this.logger.info(`Position ${position} assigned to team ${registration.teamId} for championship ${registration.championshipId}`);
            return result;
        } catch (error) {
            this.logger.error('Error assigning position by registration ID:', error);
            throw new CustomError('Error assigning position', 500, 'PositionServiceError');
        }
    }

    public assignRandomPositions = async (tenant: string, championshipId: string): Promise<Document<IPositionDocument, any, any>[]> => {
        try {
            const registrations = await this.getTotalRegistrations(tenant, championshipId);
            
            const uniquePositions = new Set<number>();
            // Generar números aleatorios únicos
            while (uniquePositions.size < registrations.totalDocs) {
                const randomPosition = Math.floor(Math.random() * registrations.totalDocs) + 1;
                uniquePositions.add(randomPosition);
            }

            // Convertir el conjunto a un array
            const positionsArray = Array.from(uniquePositions);

            // Generar posiciones aleatorias
            const positions = registrations.docs.map((registration, index) => ({
                championshipId: registration.championshipId as unknown as Types.ObjectId,
                teamId: registration.teamId as unknown as Types.ObjectId,
                position: positionsArray[index],
                assignedAutomatically: true
            }));

            // Eliminar posiciones existentes para el campeonato
            await DatabaseHelper.deleteMany(Position, tenant, { championshipId: new Types.ObjectId(championshipId) });

            // Guardar nuevas posiciones
            const result = await DatabaseHelper.insertDocumentsConcurrently(Position, tenant, positions);

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
}