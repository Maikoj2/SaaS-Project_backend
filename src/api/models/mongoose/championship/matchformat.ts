import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IMatchFormatDocument extends ITenantDocument {
    formatType: 'single_set' | 'best_of_3' | 'best_of_5' | 'best_of_2' | 'tiebreaker_only' | 'fast_match' | 'custom';
    description?: string;
    isCustom: {
        sets: number;
        pointsPerSet: number;
        tiebreakerPoints?: number;
        maxPointsPerSet?: number;
        minAdvantage: boolean;
        customRules?: string;
    };
    deletedAt: Date;
    updatedAt?: Date;
}

export interface IMatchFormatModel extends ITenantModel<IMatchFormatDocument> {
    byTenant(tenant: string): ITenantModel<IMatchFormatDocument>;
}

// Schema
const MatchFormatSchema = new Schema<IMatchFormatDocument>(
    {
        formatType: {
            type: String,
            enum: ['single_set', 'best_of_3', 'best_of_5', 'best_of_2', 'tiebreaker_only', 'fast_match', 'custom'],
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        isCustom: {
            type: Boolean,
            default: false,
        },
        config: {
            sets: {
                type: Number,
                required: false,
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
                type: Boolean,
                default: false,
            },
            customRules: {
                type: String,
                required: false,
            }
        },
        deletedAt: { 
            type: Date, 
            default: null 
        }
    },
    { 
        timestamps: true, 
        versionKey: false 
    }
);

// Plugins
MatchFormatSchema.plugin(mongoTenant);
MatchFormatSchema.plugin(mongoosePaginate);
MatchFormatSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const MatchFormat: ITenantModel<IMatchFormatDocument> = model<IMatchFormatDocument, IMatchFormatModel>('MatchFormat', MatchFormatSchema);
export default MatchFormat;