import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

interface ITeamRanking {
    teamId: Types.ObjectId;
    position: number;
    points: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    walkovers: number;
    setsFor: number;
    setsAgainst: number;
    setRatio: number;
    pointsFor: number;
    pointsAgainst: number;
    pointRatio: number;
}

export interface IGroupDocument extends ITenantDocument {
    championshipId?: Types.ObjectId;
    groupDistributionId?: Types.ObjectId;
    name: string;
    teams: Types.ObjectId[];
    matches: Types.ObjectId[];
    rankings?: ITeamRanking[];
    status: 'active' | 'completed';
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
    walkovers: {
        type: Number,
        default: 0
    },
    setsFor: {
        type: Number,
        default: 0
    },
    setsAgainst: {
        type: Number,
        default: 0
    },
    setRatio: {
        type: Number,
        default: 0
    },
    pointsFor: {
        type: Number,
        default: 0
    },
    pointsAgainst: {
        type: Number,
        default: 0
    },
    pointRatio: {
        type: Number,
        default: 0
    }
}, { _id: false });

const GroupSchema = new Schema<IGroupDocument>(
    {
        championshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: false
        },
        groupDistributionId: {
            type: Schema.Types.ObjectId,
            ref: 'GroupDistribution',
            required: false
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
GroupSchema.index({ phaseId: 1, name: 1 }, { unique: true, sparse: true });
GroupSchema.index({ groupDistributionId: 1, name: 1 }, { unique: true, sparse: true });
// Plugins
GroupSchema.plugin(mongoTenant);
GroupSchema.plugin(mongoosePaginate);
GroupSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Group: ITenantModel<IGroupDocument> = model<IGroupDocument, IGroupModel>('Group', GroupSchema);
export default Group;