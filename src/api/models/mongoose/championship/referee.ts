import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IRefereeDocument extends ITenantDocument {
    name: string;
    email: string;
    phone?: string;
    experienceYears?: number;
    certificationLevel?: string;
    specialization?: string;
    availabilityStatus: 'available' | 'busy' | 'unavailable';
    championshipId: Schema.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IRefereeModel extends ITenantModel<IRefereeDocument> {
    byTenant(tenant: string): ITenantModel<IRefereeDocument>;
}

const RefereeSchema = new Schema<IRefereeDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            trim: true
        },
        experienceYears: {
            type: Number,
            min: 0
        },
        certificationLevel: {
            type: String,
            enum: ['national', 'international', 'regional', 'local', 'beginner']
        },
        specialization: {
            type: String,
            trim: true
        },
        availabilityStatus: {
            type: String,
            enum: ['available', 'busy', 'unavailable'],
            default: 'available'
        },
        championshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Indexes
RefereeSchema.index({ email: 1 }, { unique: true });
RefereeSchema.index({ championshipId: 1 });
RefereeSchema.index({ availabilityStatus: 1 });

// Plugins
RefereeSchema.plugin(mongoTenant);
RefereeSchema.plugin(mongoosePaginate);
RefereeSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

export const Referee: ITenantModel<IRefereeDocument> = model<IRefereeDocument, IRefereeModel>('Referee', RefereeSchema);
export default Referee;
