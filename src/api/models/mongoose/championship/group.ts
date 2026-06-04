import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { GroupStatus } from "../../../constants/championshipStatus.constants";

interface ITeamRankingDocument {
    teamId: Schema.Types.ObjectId;
    position: number;
    points: number;
    pointsFor: number;
    pointsAgainst: number;
    matchesPlayed: number;
    won: number;
    lost: number;
    drawn: number;
    setsWon: number;
    setsLost: number;
    setsDifference: number;
    setsPlayed: number;
    yellowCards: number;
    redCards: number;
}

export interface IGroupDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    phaseId: Types.ObjectId;
    groupDistributionId?: Types.ObjectId;
    name: string;
    teams: Types.ObjectId[];
    matches?: Types.ObjectId[];
    rankings?: ITeamRankingDocument[];
    status: GroupStatus;
    deletedAt?: Date;
}

export interface IGroupModel extends ITenantModel<IGroupDocument> {
    byTenant(tenant: string): ITenantModel<IGroupDocument>;
    findByPhase(phaseId: string): Promise<IGroupDocument[]>;
    updateRankings(groupId: string, rankings: ITeamRankingDocument[]): Promise<IGroupDocument>;
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
    pointsFor: {
        type: Number,
        default: 0
    },
    pointsAgainst: {
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
    setsWon: {
        type: Number,
        default: 0
    },
    setsLost: {
        type: Number,
        default: 0
    },
    setsDifference: {
        type: Number,
        default: 0
    },
    setsPlayed: {
        type: Number,
        default: 0
    },
    yellowCards: {
        type: Number,
        default: 0
    },
    redCards: {
        type: Number,
        default: 0
    }
}, { _id: false });

const GroupSchema = new Schema<IGroupDocument>(
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
            enum: GroupStatus,
            default: GroupStatus.ACTIVE
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