import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Types } from "mongoose";

export interface IPhaseDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    name: string;
    order: number;
    previousPhaseId?: Types.ObjectId;
    nextPhaseId?: Types.ObjectId;
    gameFormatId: Types.ObjectId;
    groups: Schema.Types.ObjectId[];
    matches: Schema.Types.ObjectId[];
    status: 'pending' | 'in_progress' | 'completed';
    startDate?: Date;
    endDate?: Date;
}

export interface IPhaseModel extends ITenantModel<IPhaseDocument> {
    byTenant(tenant: string): ITenantModel<IPhaseDocument>;
    findByChampionship(championshipId: string): Promise<IPhaseDocument[]>;
}

const PhaseSchema = new Schema<IPhaseDocument>(
    {
        championshipId: {
            type: Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        order: {
            type: Number,
            required: true
        },
        previousPhaseId: {
            type: Types.ObjectId,
            ref: 'Phase'
        },
        nextPhaseId: {
            type: Types.ObjectId,
            ref: 'Phase'
        },
        gameFormatId: {
            type: Types.ObjectId,
            ref: 'GameFormat',
            required: true
        },
        groups: [{
            type: Types.ObjectId,
            ref: 'Group'
        }],
        matches: [{
            type: Types.ObjectId,
            ref: 'Match'
        }],
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed'],
            default: 'pending'
        },
        startDate: Date,
        endDate: Date
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
PhaseSchema.index({ championshipId: 1, order: 1 }, { unique: true });
PhaseSchema.index({ status: 1 });

// Plugins
PhaseSchema.plugin(mongoTenant);
PhaseSchema.plugin(mongoosePaginate);
PhaseSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

PhaseSchema.virtual('progress').get(async function () {
    if (this.status === 'completed') return 100;
    if (this.status === 'pending') return 0;

    const populatedPhase = await this.populate('matches');
    const completedMatches = populatedPhase.matches.filter((match: any) => match.status === 'completed').length;
    return Math.round((completedMatches / this.matches.length) * 100);
});

// Export
export const Phase: ITenantModel<IPhaseDocument> = model<IPhaseDocument, IPhaseModel>('Phase', PhaseSchema);
export default Phase;