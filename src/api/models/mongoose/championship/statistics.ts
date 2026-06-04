import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IStatisticsDocument extends ITenantDocument {
    matchId: Types.ObjectId;
    playerId: Types.ObjectId;
    teamId: Types.ObjectId;
    points: number;
    assists: number;
    rebounds: number;
    fouls: number;
    yellowCards: number;
    redCards: number;
    minutesPlayed: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStatisticsModel extends ITenantModel<IStatisticsDocument> {
    byTenant(tenant: string): ITenantModel<IStatisticsDocument>;
    findByMatch(matchId: string): Promise<IStatisticsDocument[]>;
    findByPlayer(playerId: string): Promise<IStatisticsDocument[]>;
}

const StatisticsSchema = new Schema<IStatisticsDocument>(
    {
        matchId: {
            type: Schema.Types.ObjectId,
            ref: 'Match',
            required: true
        },
        playerId: {
            type: Schema.Types.ObjectId,
            ref: 'Player',
            required: true
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: true
        },
        points: {
            type: Number,
            default: 0
        },
        assists: {
            type: Number,
            default: 0
        },
        rebounds: {
            type: Number,
            default: 0
        },
        fouls: {
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
        },
        minutesPlayed: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
StatisticsSchema.index({ matchId: 1, playerId: 1 }, { unique: true });
StatisticsSchema.index({ playerId: 1 });

// Plugins
StatisticsSchema.plugin(mongoTenant);
StatisticsSchema.plugin(mongoosePaginate);
StatisticsSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Statistics: ITenantModel<IStatisticsDocument> = model<IStatisticsDocument, IStatisticsModel>('Statistics', StatisticsSchema);
export default Statistics;