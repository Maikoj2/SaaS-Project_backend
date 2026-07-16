import { model, Schema, Types } from "mongoose";
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
    championshipId: Types.ObjectId;
    phaseId?: Types.ObjectId;
    groupId?: Types.ObjectId;
    homeTeamId: Types.ObjectId;
    awayTeamId: Types.ObjectId;
    courtId?: Types.ObjectId;
    winnerId?: Types.ObjectId;
    gameFormatId?: Types.ObjectId;
    statistics: Types.ObjectId[];
    score?: IScore;
    status: 'scheduled' | 'in_progress' | 'finished' | 'walkover' | 'cancelled'
    isEliminationMatch: boolean;
    eliminationBracketId?: Types.ObjectId;
    bracketMatchNumber?: number;
    bracketRoundName?: string;
    bracketRoundLabel?: string;
    bracketPosition?: number;
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
            type: Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        phaseId: {
            type: Types.ObjectId,
            ref: 'Phase',
            required: false
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
            required: false
        },
        gameFormatId: {
            type: Schema.Types.ObjectId,
            ref: 'GameFormat',
            required: false
        },
        winnerId: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
        },
        statistics: [{
            type: Schema.Types.ObjectId,
            ref: 'Statistics'
        }],
        score: ScoreSchema,
        status: {
            type: String,
            enum: ['scheduled', 'in_progress', 'finished', 'walkover', 'cancelled'],
            default: 'scheduled'
        },
        isEliminationMatch: {
            type: Boolean,
            default: false,
        },
        eliminationBracketId: {
            type: Schema.Types.ObjectId,
            ref: 'EliminationBracket',
            required: false,
        },
        bracketMatchNumber: {
            type: Number,
            required: false,
        },
        bracketRoundName: {
            type: String,
            required: false,
        },
        bracketRoundLabel: {
            type: String,
            required: false,
        },
        bracketPosition: {
            type: Number,
            required: false,
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
MatchSchema.pre('save', function (next) {
    if (this.homeTeamId?.toString() === this.awayTeamId?.toString()) {
        next(new Error('Home team and away team must be different'));
        return;
    }
    next();
});

// Métodos estáticos
MatchSchema.statics.findByPhase = function (phaseId: string) {
    return this.find({ phaseId })
        .sort('startTime')
        .populate(['homeTeamId', 'awayTeamId', 'courtId']);
};

MatchSchema.statics.findByGroup = function (groupId: string) {
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