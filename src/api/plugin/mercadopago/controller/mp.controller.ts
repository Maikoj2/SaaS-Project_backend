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

export interface MercadoPagoPayer {
  role: string;
  name: string;
  surname?: string;
  email: string;
  areaCode?: string;
  phoneNumber?: string;
  address?: string;
}

export class PaymentController {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  async getMercadoPagoLink(
    purchaseData: PurchaseData,
    tenant: string,
    urls: PaymentUrls,
    payer: MercadoPagoPayer
  ): Promise<string | PaymentError> {
    try {
      if (!purchaseData) {
        throw new Error('Purchase data is required');
      }

      if (!tenant) {
        throw new Error('Tenant is required');
      }

      if (!urls?.success || !urls?.pending || !urls?.failure) {
        throw new Error('Payment redirect URLs are required');
      }

      if (!payer?.email) {
        throw new Error('Payer email is required');
      }

      if (!payer?.name) {
        throw new Error('Payer name is required');
      }

      const checkout = await this.paymentService.getMercadoPagoLink(
        purchaseData,
        tenant,
        urls,
        payer
      );

      return checkout;
    } catch (err) {
      logger.error('Error en getMercadoPagoLink', { err });

      return {
        error: true,
        msg: 'Hubo un error con Mercado Pago, asegúrate de tener la divisa correcta',
        details: err
      };
    }
  }

  async getPaymentDetails(
    tenant: string,
    paymentId: string
  ): Promise<PaymentResponse | PaymentError> {
    try {
      if (!tenant) {
        throw new Error('Tenant is required');
      }

      if (!paymentId) {
        throw new Error('Payment ID is required');
      }

      const payment = await this.paymentService.getPaymentDetails(
        tenant,
        paymentId
      );

      return payment;
    } catch (err) {
      logger.error('Error en getPaymentDetails', { err });

      return {
        error: true,
        msg: 'Hubo un error con Mercado Pago, asegúrate de tener la divisa correcta',
        details: err
      };
    }
  }
}