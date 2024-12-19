import { Schema, model, Document, Model, PaginateModel } from 'mongoose';
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { readFileSync } from 'fs';
import path from 'path';
import { ITenantDocument, ITenantModel } from '../../../interfaces';

// Enums
export enum Language {
    SpanishES = 'es-ES',
    SpanishMX = 'es-MX',
    EnglishUS = 'en-US',
    EnglishGB = 'en-GB'
}

// Interfaces
export interface ICard {
    cardPlaceholder?: string;
    cardToken?: string;
    cardNumber?: string;
    cardUser: string;
    brand?: string;
    cardExp?: string;
}

export interface IPlan {
    title: string;
    price: number;
    createdAt: Date;
}

export interface ISettingsDocument extends ITenantDocument {
    name: string | null;
    owner: string;
    currencySymbol: string | null;
    currency: string | null;
    logo: string | null;
    plugins: any[];
    tax: any[];
    taxOffset: any[];
    language: Language;
    invoiceDesign: { html: string };
    purchaseDesign: { html: string };
    invoiceFormat: string;
    payment: ICard | null;
    planDate: IPlan;
}

// Agregar después de las interfaces
export interface ISettingsModel extends Model<ISettingsDocument>, PaginateModel<ISettingsDocument> {
    byTenant(tenant: string): PaginateModel<ISettingsDocument>;
}

// Schemas
const CardSchema = new Schema<ICard>({
    cardPlaceholder: {
        type: String,
        select: false
    },
    cardToken: {
        type: String,
        select: false
    },
    cardNumber: {
        type: String
    },
    cardUser: {
        type: String,
        required: true
    },
    brand: {
        type: String
    },
    cardExp: {
        type: String
    }
});

const PlanSchema = new Schema<IPlan>({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Helpers
const getInitialTemplate = (): { html: string } => {
    // try {
        
        const filePath = path.resolve(__dirname, '../../../templates/initial_invoice.html');
        console.log(filePath);
        return {
            html: readFileSync(filePath, 'utf-8')
        };
    // } catch (error) {
    //     // return {
    //     //     html: '<div class="invoice-template">Plantilla básica</div>'
    //     // };
    // }
};

const getBasicPlan = (): IPlan => ({
    title: "Plan Base",
    price: 0.00,
    createdAt: new Date()
});

// Main Schema
const SettingsSchema = new Schema<ISettingsDocument, ISettingsModel>({
    name: { 
        type: String,
        default: null 
    },
    owner: { 
        type: String,
        required: true 
    },
    currencySymbol: { 
        type: String,
        default: null 
    },
    currency: { 
        type: String,
        default: null 
    },
    logo: { 
        type: String,
        default: null 
    },
    plugins: { 
        type: [Object],
        default: [] 
    },
    tax: { 
        type: [Object],
        default: [] 
    },
    taxOffset: { 
        type: [Object],
        default: [] 
    },
    language: { 
        type: String,
        enum: Object.values(Language),
        default: Language.SpanishES 
    },
    invoiceDesign: { 
        type: Object,
        default: getInitialTemplate() 
    },
    purchaseDesign: { 
        type: Object,
        default: getInitialTemplate() 
    },
    invoiceFormat: { 
        type: String,
        default: '%%%%%' 
    },
    payment: { 
        type: CardSchema,
        default: null 
    },
    planDate: { 
        type: PlanSchema,
        default: getBasicPlan() 
    },
    deletedAt: { type: Date, default: null }
}, {
    timestamps: true,
    versionKey: false
});

// Plugins
SettingsSchema.plugin(mongoTenant);
SettingsSchema.plugin(mongoosePaginate);
SettingsSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Índices
SettingsSchema.index({ owner: 1 });
SettingsSchema.index({ language: 1 });

// Métodos
SettingsSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.payment?.cardToken;
    delete obj.payment?.cardPlaceholder;
    return obj;
};

// Export
export const Settings: ITenantModel<ISettingsDocument> = model<ISettingsDocument, ISettingsModel>('Settings', SettingsSchema);
export default Settings;