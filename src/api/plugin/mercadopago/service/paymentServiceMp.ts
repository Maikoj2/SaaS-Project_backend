import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { CustomError } from '../../../errors';
import { DatabaseHelper } from '../../../utils/database.helper';

import { PaymentUrls, PurchaseData } from '../controller/mp.controller';
import { PayerData } from '../../../services/championship/registration.service';
import PluginSetting from '../../../models/mongoose/plugins/pluginsettings';
import { Logger } from '../../../config';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';


const logger = new Logger();
interface PaymentNotification {
  action: string;
  api_version?: string;
  data: {
    id: string;  // ID del pago
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: 'payment';
  user_id: string;
}
export class PaymentService {
  async getMercadoPagoLink(
    purchaseData: PurchaseData,
    tenant: string,
    urls: PaymentUrls,
    dataUser: PayerData
  ): Promise<any> {
    try {
      // Obtener configuración
      const accessToken = await this.getDataAccess(tenant);
      // Configurar cliente de MercadoPago
      // Configurar cliente
      const client = new MercadoPagoConfig({
        accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: `${tenant}-${Date.now()}`
        }
      });

      // Inicializar API de preferencias
      const preference = new Preference(client);

      const response = await preference.create({
        body: {
          items: [{
            id: `${tenant}-${Date.now()}`,
            title: purchaseData.description,
            unit_price: purchaseData.price,
            quantity: 1,
            currency_id: purchaseData.currency
          }],
          back_urls: {
            success: urls.success,
            failure: urls.failure,
            pending: urls.pending,
            
          },
          auto_return: "approved",
          binary_mode: true,
          metadata: {
            tenant_id: tenant,
            purchase_id: purchaseData.metadata.purchase_id
          }
        }
      })


      if (!response.init_point) {
        throw new Error('Failed to generate MercadoPago link');
      }

      return {
        init_point: response.init_point,
      };

    } catch (error) {
      console.error('MercadoPago Error:', error);
      throw new CustomError(
        `Error creating MercadoPago payment: ${error}`,
        500,
        'MercadoPagoError'
      );
    }
  }
  // async processWebhookNotification(tenant: string, notification: PaymentNotification): Promise<void> {
  //   // try {
  //   //   if (!notification?.data?.id) {
  //   //     throw new CustomError('Notificación de pago inválida', 400, 'MercadoPagoError');
  //   //   }

  //   //   const paymentId = notification.data.id;
  //   //   logger.info('Procesando notificación de pago', { paymentId });

  //   //   // Obtener los detalles del pago desde MercadoPago
  //   //   const payment = await this.getPaymentDetails(tenant, paymentId);

  //   //   // Actualizar el estado de la suscripción al campeonato
  //   //   await this.updateSubscriptionStatus(payment);

  //   // } catch (error) {
  //   //   logger.error('Error procesando notificación de pago', { error });
  //   //   throw new CustomError(
  //   //     `Error procesando pago: ${error}`,
  //   //     500,
  //   //     'MercadoPagoError'
  //   //   );
  //   // }
  // }

  public async getPaymentDetails(tenant: string, paymentId: string): Promise<PaymentResponse> {
    // Aquí implementarías la llamada a la API de MercadoPago
    // para obtener los detalles del pago
    try {
      const accessToken = await this.getDataAccess(tenant);
      const client = new MercadoPagoConfig({
        accessToken,
        options: {
          timeout: 5000,
          idempotencyKey: `${tenant}-${Date.now()}`
        }
      });
      const payment = await new Payment(client).get({ id: paymentId });
      if (!payment) {
        throw new Error('Payment not found');
      }
      return payment ;
    } catch (error) {
      console.error('MercadoPago Error:', error);
      throw new CustomError(
        `Error creating MercadoPago payment: ${error}`,
        500,
        'MercadoPagoError'
      );
    }
  }

  // private async updateSubscriptionStatus(payment: any): Promise<void> {
  //   // Aquí implementarías la lógica para:
  //   // 1. Verificar que el pago fue exitoso (status: 'approved')
  //   // 2. Actualizar el estado de la suscripción en tu base de datos
  //   // 3. Posiblemente enviar una notificación al usuario

  //   if (payment.status === 'approved') {
  //     // Actualizar estado de la suscripción
  //     // await DatabaseHelper.updateOne(...);

  //     logger.info('Suscripción actualizada exitosamente', {
  //       paymentId: payment.id,
  //       status: payment.status
  //     });
  //   }
  // }

  private async getDataAccess(tenant: string) {
    // Obtener configuración
    const settings = await DatabaseHelper.findOne(
      PluginSetting,
      tenant,
      { "plugin.path": "mercadopago" }
    );

    if (!settings?.plugin?.features?.keys?.secretID) {
      throw new Error('MercadoPago configuration not found');
    }
    const accessToken = settings?.plugin?.features?.keys?.secretID;
    logger.info('MercadoPago configuration', { accessToken });
    if (!accessToken) {
      throw new CustomError(
        'Invalid MercadoPago access token',
        400,
        'MercadoPagoError'
      );
    }
    return accessToken;
  }
} 