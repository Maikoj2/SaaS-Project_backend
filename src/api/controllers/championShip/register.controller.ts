import { Response } from 'express';
import { IUserCustomRequest } from '../../interfaces';

import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';

import { PurchaseData } from '../../plugin/mercadopago/controller/mp.controller';
import { ChampionshipService } from '../../services/championship/championship.service';
import { RegistrationService } from '../../services/championship/register.service';
import { CustomError } from '../../errors';


export class RegistrationController {
    private registrationService: RegistrationService;
    private logger: Logger;
    private championshipService: ChampionshipService;

    constructor() {
        this.registrationService = new RegistrationService();
        this.logger = new Logger();
        this.championshipService = new ChampionshipService();
    }

    public registerWithInvitation = async (req: IUserCustomRequest, res: Response) => {
        let registrationAdde = false;
        let teamAdde = false;
        let result: any;
        try {
            const { payerData, ...registrationData } = req.body;
            const code = req.params.code;
            const tenant = req.clientAccount as string;
            result = await this.registrationService.registerWithInvitation(
                tenant,
                code,
                registrationData,
                payerData
            );

            if (!result.paymentLink) {
                throw new CustomError(
                    'Failed to generate payment link',
                    500,
                    'RegistrationError'
                );
            }

            await this.championshipService.addRegistrationId(
                result.registration.championshipId,
                tenant,
                result.registration._id
            );
            registrationAdde = true;

            await this.championshipService.updateTeamId(
                tenant,
                result.registration.championshipId,
                result.registration.teamId
            );
            teamAdde = true;
            res.status(201).json(
                ApiResponse.success({
                    message: 'Registration and payment link generated successfully',
                    data: {
                        registration: result.registration,
                        paymentUrl: result.paymentLink
                    }
                })
            );
        } catch (error: any) {
            this.logger.error('Error in registration process:', error);
            if (result) {
                await this.registrationService.deleteRegistrationId(
                    result.registration._id,
                    req.clientAccount as string
                );
            }
            if (registrationAdde) {
                await this.championshipService.deleteRegistrationId(
                    req.clientAccount as string,
                    result.registration.championshipId,
                    result.registration._id
                );
            }
            if (teamAdde) {
                await this.championshipService.deleteTeamId(
                    req.clientAccount as string,
                    result.registration.championshipId,
                    result.registration.teamId
                );
            }
            res.status(error.statusCode || 400).json(ApiResponse.error(error instanceof Error ? error.message : 'Error registering team'));
        }
    }

    public getRegistrationStatus = async (req: IUserCustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const tenant = req.clientAccount as string;

            const registration = await this.registrationService.getRegistrationStatus(
                tenant,
                id
            );

            res.status(200).json(ApiResponse.success({
                data: registration
            }));
        } catch (error: any) {
            this.logger.error('Error getting registration status:', error);
            res.status(400).json(ApiResponse.error(error.message));
        }
    }

    public handlePaymentWebhook = async (req: IUserCustomRequest, res: Response) => {
        try {
            const tenant = req.params.tenantId;
            const registrationId = req.params.id;
            const topic =
                req.query.topic ||
                req.query.type ||
                req.body?.type ||
                req.body?.action;

            const paymentId =
                req.body?.data?.id ||
                req.query['data.id'] ||
                req.query.id ||
                req.body?.id;

            if (!tenant || !registrationId) {
                this.logger.warn('MercadoPago webhook missing tenant or registration id');
                return res.status(200).json({ received: true });
            }

            const isPaymentNotification = topic === 'payment';

            if (!isPaymentNotification) {
                this.logger.info('Ignoring non-payment MercadoPago webhook', {
                    tenant,
                    registrationId,
                    topic,
                });

                return res.status(200).json({ received: true });
            }

            if (!paymentId) {
                this.logger.warn('MercadoPago webhook missing payment id', {
                    body: req.body,
                    query: req.query,
                });
                return res.status(200).json({ received: true });
            }

            const paymentDetails: any = await this.registrationService.getPaymentDetails(
                tenant,
                String(paymentId)
            );

            if (paymentDetails?.error) {
                this.logger.error('Could not fetch MercadoPago payment details', paymentDetails);
                return res.status(200).json({ received: true });
            }

            const metadata = paymentDetails.metadata || {};
            const metadataTenant = metadata.tenant_id;
            const metadataRegistrationId = metadata.purchase_id;

            if (metadataTenant !== tenant || metadataRegistrationId !== registrationId) {
                this.logger.warn('MercadoPago metadata does not match webhook route', {
                    tenant,
                    registrationId,
                    metadataTenant,
                    metadataRegistrationId,
                    paymentId,
                });

                return res.status(200).json({ received: true });
            }
            if (paymentDetails.status === 'approved') {
                const registration = await this.registrationService.getRegistrationStatus(
                    tenant,
                    registrationId
                );

                if (
                    registration.registrationStatus === 'confirmed' &&
                    registration.transactionId === String(paymentId)
                ) {
                    this.logger.info('MercadoPago webhook already processed', {
                        tenant,
                        registrationId,
                        paymentId,
                    });

                    return res.status(200).json({ received: true });
                }
                await this.registrationService.updateRegistrationStatus(
                    tenant,
                    {
                        registrationId,
                        status: 'confirmed',
                        transactionId: String(paymentId),
                    }
                );
                this.logger.info('Registration confirmed from MercadoPago webhook', {
                    tenant,
                    registrationId,
                    paymentId,
                });
            }

            return res.status(200).json({ received: true });

        } catch (error: any) {
            this.logger.error('Error processing webhook:', error);
            // Siempre devolver 200 para webhooks, incluso en error
            res.status(200).json({ received: true });
        }
    }
}
