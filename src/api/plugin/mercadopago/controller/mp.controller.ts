import { Request, Response } from 'express';
import { PaymentService } from '../service/paymentServiceMp';
import { Logger } from '../../../config/logger/WinstonLogger';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';

const logger = new Logger();

export interface PaymentError {
  error: boolean;
  msg: string;
  details: any;
}

export interface PurchaseData {
  currency: string;
  price: number;
  description: string;
  metadata: {
    tenant_id: string;
    purchase_id: string;
  };
}

export interface PaymentUrls {
  success: string;
  pending: string;
  failure: string;
}

export class PaymentController {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  async getMercadoPagoLink(purchaseData: PurchaseData, tenant: string, urls: PaymentUrls, payer: any): Promise<string | PaymentError> {
    try {

      const checkout = await this.paymentService.getMercadoPagoLink(purchaseData, tenant, urls, payer);
      return checkout;
    } catch (err) {
      logger.error('Error en getMercadoPagoLink', { err });
      return {
        error: true,
        msg: "Hubo un error con Mercado Pago, asegurate de tener la divisa correcta",
        details: err
      };
    }
  }
  async getPaymentDetails(tenant: string, paymentId: string): Promise<PaymentResponse | PaymentError> {
    try {
      const payment = await this.paymentService.getPaymentDetails(tenant, paymentId);
      return payment;
    } catch (err) {
      logger.error('Error en getPaymentDetails', { err });
      return {
        error: true ,
        msg: "Hubo un error con Mercado Pago, asegurate de tener la divisa correcta",
        details: err
      };
    }
  }
}

//   async webhook(req: Request, res: Response): Promise<Response> {
//     try {
//         if (req.method !== "POST") {
//             return res.status(405).json({ error: "Método no permitido" });
//         }

//         const payment = req.body;
//         logger.info('Webhook MercadoPago recibido', { payment });

//         // Aquí deberías verificar la autenticidad del webhook
//         // y procesar la notificación según el tipo de evento
//         await this.paymentService.processWebhookNotification(payment);

//         return res.status(200).json({ status: "ok" });
//     } catch (error) {
//         logger.error('Error en webhook de MercadoPago', { error });
//         return res.status(500).json({ error: "Error interno del servidor" });
//  