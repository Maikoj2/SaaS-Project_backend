import mongoose, { model, Schema, Model } from 'mongoose';
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ChampionshipType } from './championship';

// Interfaces

export interface ITeamDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    clubId: Schema.Types.ObjectId;
    name: string;
    logo?: string;
    players: Schema.Types.ObjectId[];
    participationHistory: {
        championshipId: Schema.Types.ObjectId;
        year: number;
        position: number;
    }[];
    status: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}

type TeamSizeRules = {
    [K in ChampionshipType]: { min: number; max: number };
};
const teamSizeRules: TeamSizeRules = {
    [ChampionshipType.BEACH]: { min: 2, max: 2 },
    [ChampionshipType.INDOOR]: { min: 6, max: 14 },
};

export interface ITeamModel extends ITenantModel<ITeamDocument> {
    byTenant(tenant: string): ITenantModel<ITeamDocument>;
    findByChampionship(championshipId: string): Promise<ITeamDocument[]>;
    findWithPlayers(id: string): Promise<ITeamDocument>;
}

// Schema
const TeamSchema = new Schema<ITeamDocument>(
    {
        
        name: {
            type: String,
            required: true
        },
        logo: {
            type: String
        },
        players: [{
            type: Schema.Types.ObjectId,
            ref: 'Player',
            required: true
        }],
        clubId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Club', 
            required: false 
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
        },
        participationHistory: [
            {
                championshipId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Championship'
                },
                year: {
                    type: Number
                },
                position: {
                    type: Number
                }
            }
        ]
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
TeamSchema.index({ championshipId: 1, name: 1 }, { unique: true });
TeamSchema.index({ status: 1 });


// Plugins
TeamSchema.plugin(mongoTenant);
TeamSchema.plugin(mongoosePaginate);
TeamSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Team: ITenantModel<ITeamDocument> = model<ITeamDocument, ITeamModel>('Team', TeamSchema);
export default Team;