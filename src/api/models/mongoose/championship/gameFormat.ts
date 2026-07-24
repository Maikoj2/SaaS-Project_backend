import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IGameFormatDocument extends ITenantDocument {
    formatType: 'single_set' | 'best_of_3' | 'best_of_2' | 'custom';
    description?: string;
    sets: number;
    pointsPerSet: number;
    tiebreakerPoints?: number;
    maxPointsPerSet?: number;
    minAdvantage: number;
    customRules?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGameFormatModel extends ITenantModel<IGameFormatDocument> {
    byTenant(tenant: string): ITenantModel<IGameFormatDocument>;
}

// Schema
const GameFormatSchema = new Schema<IGameFormatDocument>(
    {
        formatType: {
            type: String,
            enum: ['single_set', 'best_of_3', 'best_of_2', 'custom'],
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        sets: {
            type: Number,
            default: 1,
        },
        pointsPerSet: {
            type: Number,
            required: true,
        },
        tiebreakerPoints: {
            type: Number,
            required: false,
        },
        maxPointsPerSet: {
            type: Number,
            required: false,
        },
        minAdvantage: {
            type: Number,
            default: 2,
        },
        customRules: {
            type: String,
            required: false,
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

// Plugins
GameFormatSchema.plugin(mongoTenant);
GameFormatSchema.plugin(mongoosePaginate);
GameFormatSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });
// index
GameFormatSchema.index(
    { tenantId: 1, formatType: 1, pointsPerSet: 1, sets: 1 },
    { unique: true }
);// Export
export const GameFormat: ITenantModel<IGameFormatDocument> = model<IGameFormatDocument, IGameFormatModel>('GameFormat', GameFormatSchema);
export default GameFormat;