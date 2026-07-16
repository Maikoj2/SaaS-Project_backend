import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IPhaseDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    name: string;
    order: number;
    previousPhaseId?: Types.ObjectId;
    nextPhaseId?: Types.ObjectId;
    gameFormatId: Types.ObjectId;
    groups: Types.ObjectId[];
    matches: Types.ObjectId[];
    status: 'pending' | 'in_progress' | 'completed';
    startDate?: Date;
    endDate?: Date;
    deletedAt?: Date;
}

export interface IPhaseModel extends ITenantModel<IPhaseDocument> {
    byTenant(tenant: string): ITenantModel<IPhaseDocument>;
    findByChampionship(championshipId: string): Promise<IPhaseDocument[]>;
    findWithDetails(id: string): Promise<IPhaseDocument>;
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
        endDate: Date,
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

// Índices
PhaseSchema.index({ championshipId: 1, order: 1 }, { unique: true });
PhaseSchema.index({ status: 1 });
PhaseSchema.index({ startDate: 1, endDate: 1 });

// Validaciones
PhaseSchema.pre('save', function (next) {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
        next(new Error('End date must be after start date'));
        return;
    }
    next();
});

// Métodos estáticos
PhaseSchema.statics.findByChampionship = function (championshipId: string) {
    return this.find({ championshipId })
        .sort('order')
        .populate('gameFormatId');
};

PhaseSchema.statics.findWithDetails = function (id: string) {
    return this.findById(id)
        .populate([
            {
                path: 'groups',
                populate: {
                    path: 'teams'
                }
            },
            {
                path: 'matches',
                populate: ['homeTeamId', 'awayTeamId', 'courtId']
            },
            'gameFormatId'
        ]);
};

// Virtuals
PhaseSchema.virtual('isGroupPhase').get(function () {
    return this.groups && this.groups.length > 0;
});

PhaseSchema.virtual('progress').get(function () {
    if (this.status === 'completed') return 100;
    if (this.status === 'pending') return 0;

    const completedMatches = this.matches.filter((match: any) => match.status === 'completed').length;
    return Math.round((completedMatches / this.matches.length) * 100);
});

// Plugins
PhaseSchema.plugin(mongoTenant);
PhaseSchema.plugin(mongoosePaginate);
PhaseSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Phase: ITenantModel<IPhaseDocument> = model<IPhaseDocument, IPhaseModel>('Phase', PhaseSchema);
export default Phase;