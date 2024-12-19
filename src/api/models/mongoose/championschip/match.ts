import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

interface IScore {
    homeTeam: number;
    awayTeam: number;
    periods?: {
        number: number;
        homeTeam: number;
        awayTeam: number;
    }[];
}

export interface IMatchDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    phaseId: Schema.Types.ObjectId;
    groupId?: Schema.Types.ObjectId;
    homeTeamId: Schema.Types.ObjectId;
    awayTeamId: Schema.Types.ObjectId;
    courtId: Schema.Types.ObjectId;
    gameFormatId: Schema.Types.ObjectId;
    statistics: Schema.Types.ObjectId[];
    score?: IScore;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    startTime?: Date;
    endTime?: Date;
}

export interface IMatchModel extends ITenantModel<IMatchDocument> {
    byTenant(tenant: string): ITenantModel<IMatchDocument>;
    findByPhase(phaseId: string): Promise<IMatchDocument[]>;
    findByGroup(groupId: string): Promise<IMatchDocument[]>;
}

const ScoreSchema = new Schema({
    homeTeam: {
        type: Number,
        default: 0
    },
    awayTeam: {
        type: Number,
        default: 0
    },
    periods: [{
        number: Number,
        homeTeam: Number,
        awayTeam: Number
    }]
}, { _id: false });

const MatchSchema = new Schema<IMatchDocument>(
    {
        championshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        phaseId: {
            type: Schema.Types.ObjectId,
            ref: 'Phase',
            required: true
        },
        groupId: {
            type: Schema.Types.ObjectId,
            ref: 'Group'
        },
        homeTeamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true
        },
        awayTeamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true
        },
        courtId: {
            type: Schema.Types.ObjectId,
            ref: 'Court',
            required: true
        },
        gameFormatId: {
            type: Schema.Types.ObjectId,
            ref: 'GameFormat',
            required: true
        },
        statistics: [{
            type: Schema.Types.ObjectId,
            ref: 'Statistics'
        }],
        score: ScoreSchema,
        status: {
            type: String,
            enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
            default: 'scheduled'
        },
        startTime: Date,
        endTime: Date
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
MatchSchema.index({ championshipId: 1, phaseId: 1 });
MatchSchema.index({ groupId: 1 });
MatchSchema.index({ startTime: 1 });
MatchSchema.index({ status: 1 });

// Validaciones
MatchSchema.pre('save', function(next) {
    if (this.homeTeamId === this.awayTeamId) {
        next(new Error('Home team and away team must be different'));
        return;
    }
    next();
});

// Métodos estáticos
MatchSchema.statics.findByPhase = function(phaseId: string) {
    return this.find({ phaseId })
        .sort('startTime')
        .populate(['homeTeamId', 'awayTeamId', 'courtId']);
};

MatchSchema.statics.findByGroup = function(groupId: string) {
    return this.find({ groupId })
        .sort('startTime')
        .populate(['homeTeamId', 'awayTeamId', 'courtId']);
};

// Plugins
MatchSchema.plugin(mongoTenant);
MatchSchema.plugin(mongoosePaginate);
MatchSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Match: ITenantModel<IMatchDocument> = model<IMatchDocument, IMatchModel>('Match', MatchSchema);
export default Match;