import { env } from "../../config/env.config";
import { CustomError } from "../../errors";
import { Settings, } from "../../models";
import PluginSetting from "../../models/mongoose/plugins/pluginsettings";
import { PayerData } from '../../services/championship/registration.service';
import { DatabaseHelper } from "../../utils/database.helper";
import { PaymentController } from "./controller/mp.controller";
import { PaymentService } from "./service/paymentServiceMp";
import { Logger } from '../../config/logger/WinstonLogger';




const logger = new Logger();
const PaymentInstance = new PaymentController(new PaymentService());

interface Configure {
    sandbox: boolean;
    access_token: string;
}

interface Keys {
    clientID: string | null;
    secretID: string | null;
    mode: string;
}

interface DataKeys {
    keys: Keys;
    currency: string;
    validCurrency: boolean;
    currencySymbol: string;
}

interface PurchaseData {
    currency: string;
    price: number;
    description: string;
    metadata: {
        tenant_id: string;
        purchase_id: string;
    };
}

interface Urls {
    success: string;
    pending: string;
    failure: string;
}

interface DataUser extends PayerData {
    role: string;
}

const pathName = 'mercadopago';
const configure: Configure = {
    sandbox: env.MP_MODE === 'sandbox',
    access_token: env.MP_ACCESS_TOKEN,
};
const public_key: string = env.MP_CLIENT_ID;


const findSettingTenant = async (tenant: string): Promise<any> => {
    try {
        const item = await DatabaseHelper.findOne(
            Settings,
            tenant,
            {}
        );
        
        if (!item) {
            
            throw new CustomError(
                'Settings not found for tenant',
                404,
                'MercadoPagoError'
            );
        }

        return item;
    } catch (error) {
        throw new CustomError(
            `Error finding tenant settings: ${error}`,
            500,
            'MercadoPagoError'
        );
    }
};

const checkKeys = async (tenant: string, secret: string = 'plugin.features.keys.clientID'): Promise<DataKeys | null> => {
    try {
        const dataTenant = await findSettingTenant(tenant);
        
        const response = await PluginSetting
            .findOne({
                "plugin.path": pathName,
                "plugin.features.keys.clientID": { $ne: null },
                "plugin.features.keys.secretID": { $ne: null },
                "tenantId": tenant
            })
            .select(`${secret} currency currencySymbol plugin.features.keys.mode`)
            .lean()
            .exec();
            logger.warn('Settings:', { tenant, response });
        if (!response) {
            
            throw new CustomError('Settings not found', 404, 'MercadoPagoError');
        }

        const keys = response.plugin;
        const validCurrency = ['COP', 'MXN', 'USD'].includes(dataTenant.currency);
        const currencySymbol = dataTenant.currencySymbol;

        return {
            keys: keys.features.keys,
            currency: dataTenant.currency,
            validCurrency,
            currencySymbol
        };
    } catch (error) {
        throw new CustomError(
            `Error checking keys: ${error}`,
            500,
            'MercadoPagoError'
        );
    }
};

const updateSetting = async (
    purchase: any,
    template: any,
    value: Keys,
    tenant: string,
    dataUser: DataUser
): Promise<any> => {
    const { clientID = null, secretID = null, mode = 'test' } = value;
    if (dataUser.role === 'admin') {
        const item = await PluginSetting.findOneAndUpdate(
            { "plugin.path": pathName, "tenantId": tenant },
            {
                "$set": {
                    "plugin.features.keys": {
                        clientID, secretID, mode
                    }
                }
            },
            { new: true }
        );

        if (item) {
            return item;
        } else {
            throw new Error('No se encontró el documento');
        }
    }
}

const generateLink = async (
    paymentData: { price: number; description: string; track?: string;  },
    tenant: string,
    dataUser: DataUser
): Promise<any> => {
    try {
        const dataKeys = await checkKeys(tenant, 'plugin.features.keys.clientID plugin.features.keys.secretID');

        if (!dataKeys) {
            throw new CustomError('Payment configuration not found', 404, 'MercadoPagoError');
        }

        const { price, description, track } = paymentData;

        const purchaseData: PurchaseData = {
            currency: dataKeys.currency,
            price,
            description,
            metadata: {
                tenant_id: tenant,
                purchase_id: track as string
            }
        };

        const urls: Urls = {
            success: `${env.FRONTEND_URL_TENANT.replace(/__TENANT__/gi, tenant)}/add-events/${pathName}-cb/${track}`,
            pending: `${env.FRONTEND_URL_TENANT.replace(/__TENANT__/gi, tenant)}/add-events/${pathName}-cb/${track}`,
            failure: `${env.FRONTEND_URL_TENANT.replace(/__TENANT__/gi, tenant)}/add-events/${pathName}-cb/${track}`,
            
        };

        const checkout = await PaymentInstance.getMercadoPagoLink(
            purchaseData,
            tenant,
            urls,
            dataUser
        );

        if (!checkout) {
            throw new CustomError('Error generating payment link', 500, 'MercadoPagoError');
        }

        return checkout;

    } catch (error) {
        console.error('Error in generate_link:', error);
        throw new CustomError(
            `Error generating payment link: ${error}`,
            422,
            'MercadoPagoError'
        );
    }
};

const getSetting = async (tenantId: string): Promise<any> => {
    try {
        const item = await DatabaseHelper.findOne(
            Settings,
            tenantId,
            {}
        );

        if (!item) {
            throw new CustomError(
                'Settings not found',
                404,
                'MercadoPagoError'
            );
        }

        return item;
    } catch (error) {
        throw new CustomError(
            `Error getting settings: ${error}`,
            500,
            'MercadoPagoError'
        );
    }
};

export const getPaymentDetails = async (tenant: string, paymentId: string): Promise<any> => {
    return PaymentInstance.getPaymentDetails(tenant, paymentId);
}

const updatePayment = (value: Keys, tenant: string, dataUser: DataUser): Promise<any> => {
    return updateSetting(null, null, value, tenant, dataUser);
}

export const update_payment = async ({ }: any, parentModule: any, value: Keys, tenant: string, dataUser: DataUser) =>
    await updatePayment(value, tenant, dataUser)

export const generate_link = ({ }: any, parentModule: any, purchaseData: any, tenant: string, dataUser: DataUser) =>
    generateLink(purchaseData, tenant, dataUser)

export const check_keys = (purchase: any, template: any, value = {}, tenant: string | null = null, dataUser: DataUser | null = null) =>
    checkKeys(tenant as string, 'plugin.features.keys.clientID plugin.features.keys.secretID plugin.features.keys.mode')

export const get_order = async ({ }: any, parentModule: any, value: any, tenant: string, dataUser: DataUser) =>
    checkKeys(tenant, 'plugin.features.keys.clientID plugin.features.keys.secretID plugin.features.keys.mode') 