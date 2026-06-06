import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

interface ITeamRanking {
    teamId: Schema.Types.ObjectId;
    position: number;
    points: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    drawn: number;
    goalsFor: number;
    goalsAgainst: number;
}

export interface IGroupDocument extends ITenantDocument {
    phaseId: Schema.Types.ObjectId;
    name: string;
    teams: Schema.Types.ObjectId[];
    matches: Schema.Types.ObjectId[];
    rankings: ITeamRanking[];
    status: 'active' | 'completed';
    deletedAt?: Date;
}

export interface IGroupModel extends ITenantModel<IGroupDocument> {
    byTenant(tenant: string): ITenantModel<IGroupDocument>;
    findByPhase(phaseId: string): Promise<IGroupDocument[]>;
    updateRankings(groupId: string, rankings: ITeamRanking[]): Promise<IGroupDocument>;
}

const TeamRankingSchema = new Schema({
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    position: {
        type: Number,
        required: true
    },
    points: {
        type: Number,
        default: 0
    },
    matchesPlayed: {
        type: Number,
        default: 0
    },
    won: {
        type: Number,
        default: 0
    },
    lost: {
        type: Number,
        default: 0
    },
    drawn: {
        type: Number,
        default: 0
    },
    goalsFor: {
        type: Number,
        default: 0
    },
    goalsAgainst: {
        type: Number,
        default: 0
    }
}, { _id: false });

const GroupSchema = new Schema<IGroupDocument>(
    {
        phaseId: {
            type: Schema.Types.ObjectId,
            ref: 'Phase',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        teams: [{
            type: Schema.Types.ObjectId,
            ref: 'Team'
        }],
        matches: [{
            type: Schema.Types.ObjectId,
            ref: 'Match'
        }],
        rankings: [TeamRankingSchema],
        status: {
            type: String,
            enum: ['active', 'completed'],
            default: 'active'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
GroupSchema.index({ phaseId: 1, name: 1 }, { unique: true });

// Plugins
GroupSchema.plugin(mongoTenant);
GroupSchema.plugin(mongoosePaginate);
GroupSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Group: ITenantModel<IGroupDocument> = model<IGroupDocument, IGroupModel>('Group', GroupSchema);
export default Group;