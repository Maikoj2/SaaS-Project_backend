import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IGameFormatConfig {
    groups?: boolean; // Indica si hay fase de grupos
    elimination?: boolean; // Indica si hay eliminación directa
    double_elimination?: boolean; // Indica si hay eliminación doble
    group_size?: number; // Tamaño de los grupos (si aplica)
    advancement?: number; // Número de equipos que avanzan por grupo (si aplica)
    levels?: string[]; // Fases de eliminación directa (ej., "quarterfinals", "semifinals", etc.)
  }

export interface IGameFormatDocument extends ITenantDocument {
    name: string;
    description: string;
    config: IGameFormatConfig;
    deletedAt: Date;
}


export interface IGameFormatModel extends ITenantModel<IGameFormatDocument> {
    byTenant(tenant: string): ITenantModel<IGameFormatDocument>;
}

// Schema
const GameFormatSchema = new Schema<IGameFormatDocument>(
    {
        name: {
            type: String,
            required: true,
            enum: ['elimination_simple', 'elimination_double', 'groups', 'groups_and_elimination', 'league', 'swiss']
        },
        description: {
            type: String,
            required: true
        },
        config: {
            type: Object, // JSON con configuración específica
            required: true
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

// Plugins
GameFormatSchema.plugin(mongoTenant);
GameFormatSchema.plugin(mongoosePaginate);
GameFormatSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const GameFormat: ITenantModel<IGameFormatDocument> = model<IGameFormatDocument, IGameFormatModel>('GameFormat', GameFormatSchema);
export default GameFormat;