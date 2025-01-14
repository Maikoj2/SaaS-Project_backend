import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IClubDocument extends ITenantDocument {
    name: string;
    location: string;
    founded: Date;
    president: string;
    teams: Schema.Types.ObjectId[];
    website?: string;
    logo?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IClubModel extends ITenantModel<IClubDocument> {
    byTenant(tenant: string): ITenantModel<IClubDocument>;
}

// Schema
const ClubSchema = new Schema<IClubDocument>(
    {
        name: {
            type: String,
            required: true
        },
        location: {
            type: String,
            required: true
        },
        founded: {
            type: Date,
            required: true
        },
        president: {
            type: String,
            required: true
        },
        teams: [{
            type: Schema.Types.ObjectId,
            ref: 'Team'
        }],
        website: {
            type: String
        },
        logo: {
            type: String
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
ClubSchema.index({ name: 1, tenantId: 1 }, { unique: true });

// Plugins
ClubSchema.plugin(mongoTenant);
ClubSchema.plugin(mongoosePaginate);
ClubSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Club: ITenantModel<IClubDocument> = model<IClubDocument, IClubModel>('Club', ClubSchema);
export default Club; 