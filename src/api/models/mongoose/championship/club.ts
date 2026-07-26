import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Types } from "mongoose";
import { Image } from "./championship";

// Interfaces
export interface IClubDocument extends ITenantDocument {
    name: string;
    location: string;
    founded?: Date;
    president?: string;
    teams: Types.ObjectId[];
    website?: string;
    logo?: Image;
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
        },
        president: {
            type: String,
        },
        teams: [{
            type: Types.ObjectId,
            ref: 'Team'
        }],
        website: {
            type: String
        },
        logo: {
            url: {
                type: String,
                default: null
            },
            publicId: {
                type: String,
                default: null
            }
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