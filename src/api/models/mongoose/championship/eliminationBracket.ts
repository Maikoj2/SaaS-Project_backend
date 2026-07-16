import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IEliminationBracketDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    groupDistributionId: Types.ObjectId;

    name: string;

    qualification: Record<string, any>;
    bracket: Record<string, any>;

    settings: Record<string, any>;

    status: 'draft' | 'active' | 'completed' | 'archived';

    createdAt?: Date;
    updatedAt?: Date;
}

interface IEliminationBracketModel extends ITenantModel<IEliminationBracketDocument> {
    byTenant(tenant: string): ITenantModel<IEliminationBracketDocument>;
}

const EliminationBracketSchema = new Schema<IEliminationBracketDocument>(
    {
        championshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: true,
        },
        groupDistributionId: {
            type: Schema.Types.ObjectId,
            ref: 'GroupDistribution',
            required: true,
        },
        name: {
            type: String,
            default: 'Elimination Bracket',
            trim: true,
        },
        qualification: {
            type: Schema.Types.Mixed,
            required: true,
        },
        bracket: {
            type: Schema.Types.Mixed,
            required: true,
        },
        settings: {
            type: Schema.Types.Mixed,
            required: true,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'completed', 'archived'],
            default: 'active',
        },
    },
    {
        timestamps: true,
        versionKey: false
    }
);

EliminationBracketSchema.plugin(mongoosePaginate);
EliminationBracketSchema.plugin(MongooseDelete, {
    deletedAt: true,
    overrideMethods: 'all',
});

EliminationBracketSchema.index(
    {
        championshipId: 1,
        groupDistributionId: 1,
        status: 1,
    }
);
EliminationBracketSchema.plugin(mongoTenant);

// Export
export const EliminationBracket: ITenantModel<IEliminationBracketDocument> = model<IEliminationBracketDocument, IEliminationBracketModel>('EliminationBracket', EliminationBracketSchema);
export default EliminationBracket;