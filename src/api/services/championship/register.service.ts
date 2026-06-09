
import { Logger } from '../../config/logger/WinstonLogger';
import ChampionshipConfiguration, { IConfigurationDocument } from '../../models/mongoose/championship/configuration';
import InvitationLink, { IInvitationLink } from '../../models/mongoose/championship/invitationLink';
import Registration, { IRegistrationDocument } from '../../models/mongoose/championship/registration';

import { DatabaseHelper } from '../../utils/database.helper';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import Team from '../../models/mongoose/championship/team';
import { CustomError } from '../../errors';
import { generate_link, getPaymentDetails } from '../../plugin/mercadopago';
export interface PayerData {
    name: string;
    surname: string;
    email: string;
    areaCode: string;
    phoneNumber: string;
    address: string;
}

// import InvitationLink from '../../models/mongoose/championship/invitationLink';

export class RegistrationService {
    // private notificationService: NotificationService;
    private logger: Logger;

    constructor() {
        // this.notificationService = new NotificationService();
        this.logger = new Logger();
    }

    async registerWithInvitation(
        tenant: string,
        code: string,
        registrationData: IRegistrationDocument,
        payerData: PayerData
    ): Promise<any> {
        try {
            const { invitationLink, configuration } = await this.validateInitialRegistration(
                tenant,
                code,
            );
            const existTeam = await DatabaseHelper.findOne(
                Team,
                tenant,
                { _id: registrationData.teamId }
            );
            if (!existTeam) {
                throw new CustomError('Team not found', 404, 'RegistrationServiceError');
            }
            const existRegistration = await DatabaseHelper.findOne(
                Registration,
                tenant,
                { teamId: registrationData.teamId }
            );
            if (existRegistration) {
                throw new CustomError('Registration already exists', 400, 'RegistrationServiceError');
            }
            // Crear registro pendiente

            const registration = await DatabaseHelper.create(
                Registration,
                tenant,
                {
                    championshipId: invitationLink.championshipId,
                    teamId: registrationData.teamId as any,
                    registrationDate: new Date(),
                    registrationStatus: 'pending',
                    feePaid: false,
                    registrationDeadline: configuration.registrationDeadline,
                }
            );
            // Generar link de pago
            const paymentData = {
                price: configuration.registrationFee,
                description: `Inscripción al campeonato - Equipo ${registrationData.teamId}`,
                track: registration._id.toString(),
                currency: configuration.currency
            };
            const payer = {
                role: 'admin',
                name: payerData.name,
                surname: payerData.surname,
                email: payerData.email,
                areaCode: payerData.areaCode,
                phoneNumber: payerData.phoneNumber,
                address: payerData.address,

            }

            // Generar link de pago con MercadoPago
            const paymentLink = await generate_link(
                {},                  // parentModule no usado
                null,               // pluginLoader no usado
                paymentData,        // datos del pago
                tenant,             // tenant
                payer // dataUser requerido
            );
            if (!paymentLink) {
                throw new CustomError('Error generating payment link', 500, 'RegistrationServiceError');
            }

            return {
                registration,
                paymentLink
            };
        } catch (error) {
            this.logger.error('Error in registration:', error);
            throw new CustomError(
                error instanceof Error ? error.message : 'Error in registration',
                500,
                'RegistrationServiceError'
            );
        }
    }

    public async validateInitialRegistration(
        tenant: string,
        code: string
    ): Promise<{ invitationLink: IInvitationLink; configuration: IConfigurationDocument }> {
        // 1. Validar el código de invitación
        const invitationLink = await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            { code: code },
            {
                select: ['code', 'championshipId', 'maxUses', 'usedCount', 'expiresAt']
            }
        );
        console.log(invitationLink);

        if (!invitationLink) {
            throw new CustomError('Invalid or expired code invitation link');
        }

        // 2. Verificar límite de usos
        if (invitationLink.maxUses && invitationLink.usedCount >= invitationLink.maxUses) {
            throw new CustomError('Invitation link has reached maximum uses');
        }

        // 3. Obtener configuración del campeonato
        const configuration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            { championshipId: invitationLink.championshipId }
        );

        if (!configuration) {
            throw new CustomError('Championship configuration not found', 404, 'RegistrationServiceError');
        }

        // 4. Validar fecha límite
        if (new Date() > configuration.registrationDeadline) {
            throw new CustomError('Registration deadline has passed');
        }

        return { invitationLink, configuration };
    }



    async getRegistrationStatus(
        tenant: string,
        registrationId: string
    ): Promise<IRegistrationDocument> {
        const registration = await DatabaseHelper.findById(
            Registration,
            tenant,
            registrationId
        );

        if (!registration) {
            throw new CustomError('Registration not found', 404, 'RegistrationServiceError');
        }

        return registration;
    }

    async updateRegistrationStatus(tenant: string, updateData: { registrationId: string, status: 'pending' | 'confirmed' | 'rejected', transactionId: string }): Promise<void> {
        try {
            const { registrationId, status, transactionId } = updateData;

            const result = await DatabaseHelper.update(
                Registration,
                registrationId,
                tenant,
                { registrationStatus: status, paymentDate: new Date(), feePaid: true, transactionId: transactionId }
            );

            if (!result) {
                throw new Error('No se pudo actualizar el estado del registro');
            }

            this.logger.info('Estado del registro actualizado exitosamente', {
                registrationId,
                status,
                transactionId
            });
        } catch (error) {
            this.logger.error('Error actualizando el estado del registro', { error });
            throw new CustomError(
                `Error actualizando el estado del registro: ${error}`,
                500,
                'DatabaseError'
            );
        }

    }

    async getPaymentDetails(tenant: string, paymentId: string): Promise<PaymentResponse> {
        return getPaymentDetails(tenant, paymentId);
    }

}