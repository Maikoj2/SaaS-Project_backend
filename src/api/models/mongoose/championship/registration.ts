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
    comments?: string;
    players: Schema.Types.ObjectId[];
    registrationDeadline: Date;
    notes?: string;
    responsiblePerson?: Schema.Types.ObjectId;
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
        comments: { 
            type: String 
        },
        players: [
            { 
                type: Schema.Types.ObjectId, 
                ref: 'Player' 
            }
        ],
        registrationDeadline: { 
            type: Date, 
            required: true 
        },
        notes: { 
            type: String 
        },
        responsiblePerson: { 
            type: Schema.Types.ObjectId, 
            ref: 'User' 
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
    if (this.registrationDeadline < new Date()) {
        next(new Error('the registration deadline cannot be in the past'));
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