import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface ITeamDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    name: string;
    logo?: string;
    players: Types.ObjectId[];
    captainId?: Types.ObjectId;
    categoryId?: string;
    registrationType: 'manual' | 'public_link';
    clubId?: Types.ObjectId;
    status: 'pending' | 'active' | 'inactive' | 'rejected';
    registrations?: Types.ObjectId[];
    participationHistory: {
        championshipId: Types.ObjectId;
        year?: number;
        position?: number;
    }[];
}

export interface ITeamModel extends ITenantModel<ITeamDocument> {
    byTenant(tenant: string): ITenantModel<ITeamDocument>;
    findByChampionship(championshipId: string): Promise<ITeamDocument[]>;
    findWithPlayers(id: string): Promise<ITeamDocument>;
}

// Schema
const TeamSchema = new Schema<ITeamDocument>(
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
        captainId: {
            type: Types.ObjectId,
            ref: 'Player',
        },
        logo: {
            type: String
        },
        players: [{
            type: Types.ObjectId,
            ref: 'Player'
        }],
        participationHistory: [{
            championshipId: {
                type: Types.ObjectId,
                ref: 'Championship'
            },
            year: {
                type: Number,
                required: true
            },
            position: {
                type: Number,
                required: true
            }
        }],
        clubId: {
            type: Types.ObjectId,
            ref: 'Club'
        },
        registrations: [{
            type: Types.ObjectId,
            ref: 'Registration'
        }],
        registrationType: {
            type: String,
            enum: ['manual', 'public_link'],
            default: 'manual'
        },
        categoryId: {
            type: String,
            required: false,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'pending', 'rejected'],
            default: 'pending'
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
TeamSchema.index({ championshipId: 1, name: 1 }, { unique: true });
TeamSchema.index({ status: 1 });

// Métodos estáticos
TeamSchema.statics.findByChampionship = function (championshipId: string) {
    return this.find({ championshipId, status: 'active' })
        .sort('name');
};

TeamSchema.statics.findWithPlayers = function (id: string) {
    return this.findById(id)
        .populate('players');
};

// Plugins
TeamSchema.plugin(mongoTenant);
TeamSchema.plugin(mongoosePaginate);
TeamSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Team: ITenantModel<ITeamDocument> = model<ITeamDocument, ITeamModel>('Team', TeamSchema);
export default Team;