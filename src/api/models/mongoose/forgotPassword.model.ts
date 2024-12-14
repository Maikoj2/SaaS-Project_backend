import { Schema, model } from 'mongoose';
import mongoTenant from 'mongo-tenant';
import validator from 'validator';
import { ITenantDocument, ITenantModel } from '../../interfaces/model.interface';

export interface IForgotPasswordDocument extends ITenantDocument {
    email: string;
    verification: string;
    used: boolean;
    ipRequest: string;
    browserRequest: string;
    countryRequest?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IForgotPasswordModel extends ITenantModel<IForgotPasswordDocument> {
    byTenant(tenant: string): ITenantModel<IForgotPasswordDocument>;
}
const ForgotPasswordSchema = new Schema(
    {
        email: {
            type: String,
            validate: {
                validator: (value: string) => validator.isEmail(value),
                message: 'EMAIL_IS_NOT_VALID'
            },
            lowercase: true,
            required: true
        },
        verification: {
            type: String,
            required: true
        },
        used: {
            type: Boolean,
            default: false
        },
        // Información de la solicitud
        ipRequest: {
            type: String,
            required: true
        },
        browserRequest: {
            type: String,
            required: true
        },
        countryRequest: {
            type: String
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

ForgotPasswordSchema.plugin(mongoTenant);

export const ForgotPassword = model<IForgotPasswordDocument, IForgotPasswordModel>('ForgotPassword', ForgotPasswordSchema);