import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { PhaseStatus } from "../../../constants/championshipStatus.constants";

export interface IPhaseDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    name: string;
    order: number;
    previousPhaseId?: Types.ObjectId;
    nextPhaseId?: Types.ObjectId;
    groups?: Types.ObjectId[];
    matches?: Types.ObjectId[];
    status: PhaseStatus;
    startDate?: Date;
    endDate?: Date;
    startTime?: Date;
    endTime?: Date;
    courtAssignments?: {
        courtId: Types.ObjectId;
        timeSlots: Date[];
    }[];
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
        startDate: {
            type: Date,
            required: false
        },
        endDate: {
            type: Date,
            required: false
        },
        startTime: {
            type: Date,
            required: true
        },
        endTime: {
            type: Date,
            required: false
        },
        courtAssignments: [{  // Nueva estructura
            courtId: {
                type: Types.ObjectId,
                ref: 'Court',
                required: true
            },
            timeSlots: [Date]
        }]
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

PhaseSchema.virtual('progress').get(async function() {
    if (this.status === 'completed') return 100;
    if (this.status === 'pending') return 0;
    
    const populatedPhase = await this.populate('matches');
    const matches = populatedPhase.matches || [];

    const completedMatches = matches.filter((match: any) => match.status === 'completed').length;
    return Math.round((completedMatches / matches.length) * 100);
});
PhaseSchema.pre('validate', function(next) {
    if (this.startDate && this.endDate && this.startDate >= this.endDate) {
        next(new Error('La fecha de fin debe ser posterior a la de inicio'));
    }
    next();
});
PhaseSchema.virtual('groupDetails', {
    ref: 'Group',
    localField: 'groups',
    foreignField: '_id'
});

// Export
export const Phase: ITenantModel<IPhaseDocument> = model<IPhaseDocument, IPhaseModel>('Phase', PhaseSchema);
export default Phase;