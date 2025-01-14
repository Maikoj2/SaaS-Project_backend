import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IRegistrationDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    teamId: Schema.Types.ObjectId;
    registrationDate: Date;
    registrationStatus: 'pending' | 'confirmed' | 'rejected';
    feePaid: boolean;
    paymentDate?: Date;
    registrationDeadline: Date;
    transactionId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRegistrationModel extends ITenantModel<IRegistrationDocument> {
    byTenant(tenant: string): ITenantModel<IRegistrationDocument>;
}

// Schema
const RegistrationSchema = new Schema<IRegistrationDocument>(
    {
        championshipId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Championship', 
            required: true 
        },
        teamId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Team', 
            required: true 
        },
        registrationDate: { 
            type: Date, 
            default: Date.now 
        },
        registrationStatus: {
            type: String,
            enum: ['pending', 'confirmed', 'rejected'],
            default: 'pending'
        },
        feePaid: { 
            type: Boolean, 
            required: true 
        },
        paymentDate: { 
            type: Date 
        },
        transactionId: { 
            type: String 
        },
        registrationDeadline: { 
            type: Date, 
            required: true 
        },
        deletedAt: { 
            type: Date, 
            default: null 
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Índices
RegistrationSchema.index({ championshipId: 1, teamId: 1 }, { unique: true });
RegistrationSchema.index({ registrationStatus: 1 });
RegistrationSchema.index({ registrationDeadline: 1 });

// Middleware de validación
RegistrationSchema.pre('save', function(next) {
    if (this.paymentDate && this.paymentDate < this.registrationDate) {
        return next(new Error('the payment date cannot be a past date.'));
    }
    if (this.registrationDeadline && this.registrationDeadline < new Date()) {
        return next(new Error('the registration deadline cannot be a past date.'));
    }
    next();
});

// Plugins
RegistrationSchema.plugin(mongoTenant);
RegistrationSchema.plugin(mongoosePaginate);
RegistrationSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Registration: ITenantModel<IRegistrationDocument> = model<IRegistrationDocument, IRegistrationModel>('Registration', RegistrationSchema);
export default Registration;