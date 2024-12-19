import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface ITeamDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    name: string;
    logo?: string;
    players: Schema.Types.ObjectId[];
    registrations: Schema.Types.ObjectId[];
    status: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
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
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        logo: {
            type: String
        },
        players: [{
            type: Schema.Types.ObjectId,
            ref: 'Player'
        }],
        registrations: [{
            type: Schema.Types.ObjectId,
            ref: 'Registration'
        }],
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active'
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
TeamSchema.statics.findByChampionship = function(championshipId: string) {
    return this.find({ championshipId, status: 'active' })
        .sort('name');
};

TeamSchema.statics.findWithPlayers = function(id: string) {
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