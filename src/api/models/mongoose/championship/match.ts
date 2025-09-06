import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Types } from "mongoose";
import { MatchStatus } from "../../../constants/championshipStatus.constants";

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
    championshipId: Types.ObjectId;
    phaseId?: Types.ObjectId;
    groupId?: Types.ObjectId;
    homeTeamId: Types.ObjectId;
    awayTeamId: Types.ObjectId;
    courtId?: Types.ObjectId;
    statistics: Types.ObjectId[];
    round?: String;
    score?: IScore;
    status: MatchStatus;
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
            ref: 'Group',
            required: true
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
        round: String,
        statistics: [{
            type: Schema.Types.ObjectId,
            ref: 'Statistics'
        }],
        score: ScoreSchema,
        status: {
            type: String, 
            enum: Object.values(MatchStatus),
            default: MatchStatus.SCHEDULED
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