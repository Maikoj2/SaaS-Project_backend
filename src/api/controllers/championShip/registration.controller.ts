import { Response } from 'express';
import { ICustomRequest } from '../../interfaces';

import { Logger } from '../../config/logger/WinstonLogger';
import { ApiResponse } from '../../responses';
import { RegistrationService } from '../../services/championship/registration.service';
import { CustomError } from '../../errors';
import { PurchaseData } from '../../plugin/mercadopago/controller/mp.controller';
import { ChampionshipService } from '../../services/championship/championship.service';


export class RegistrationController {
    private registrationService: RegistrationService;
    private logger: Logger;
    private championshipService: ChampionshipService;

    constructor() {
        this.registrationService = new RegistrationService();
        this.logger = new Logger();
        this.championshipService = new ChampionshipService();
    }

    public registerWithInvitation = async (req: ICustomRequest, res: Response) => {
        try {

            const registrationData = req.body;
            const payerData = req.body.payerData;
            const code = req.params.code;
            const tenant = req.clientAccount as string;

            const result = await this.registrationService.registerWithInvitation(
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
            await this.championshipService.addRegistrationId(result.registration.championshipId, tenant, result.registration._id);

            res.status(201).json(ApiResponse.success({
                message: 'Registration initiated successfully',
                data: {
                    registration: result.registration,
                    paymentUrl: result.paymentLink
                }
            }));
        } catch (error: any) {
            this.logger.error('Error in registration process:', error);
            res.status(400).json(ApiResponse.error(error.message));
        }
    }

    public getRegistrationStatus = async (req: ICustomRequest, res: Response) => {
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

    public handlePaymentWebhook = async (req: ICustomRequest, res: Response) => {
        try {
            const { action, data} = req.body;
            const tenant = 'miapp';
        


            if (action === 'payment.created' || action === 'payment.updated') {
                const paymentId = data.id;

                const paymentDetails = await this.registrationService.getPaymentDetails(tenant, paymentId);

                this.logger.info('paymentDetails', paymentDetails);
                if (paymentDetails.status === 'approved') {
                    const { tenant_id,  purchase_id } = paymentDetails.metadata as PurchaseData['metadata'];
                    await this.registrationService.updateRegistrationStatus(tenant_id, { registrationId: purchase_id as string, status: 'confirmed', transactionId: paymentId });
                }
            }
    
            res.status(200).json({ received: true });

            // res.status(200).json({ received: true });
        } catch (error: any) {
            this.logger.error('Error processing webhook:', error);
            // Siempre devolver 200 para webhooks, incluso en error
            res.status(200).json({ received: true });
        }
    }
}