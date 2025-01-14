import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IPositionDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    teamId: Types.ObjectId;
    position: number;
    assignedAutomatically: boolean; // Indica si la posición fue asignada automáticamente
}

export interface IPositionModel extends ITenantModel<IPositionDocument> {
    byTenant(tenant: string): ITenantModel<IPositionDocument>;
}

// Schema
const PositionSchema = new Schema<IPositionDocument>(
    {
        championshipId: {
            type: Types.ObjectId,
            ref: 'Championship',
            required: true,
        },
        teamId: {
            type: Types.ObjectId,
            ref: 'Team',
            required: true,
        },
        position: {
            type: Number,
            required: true,
        },
        assignedAutomatically: {
            type: Boolean,
            default: false,
        },
        deletedAt: { 
            type: Date, 
            default: null 
        }
    },
    {
        versionKey: false,
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Plugins
PositionSchema.plugin(mongoTenant);
PositionSchema.plugin(mongoosePaginate);
PositionSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Índice compuesto para evitar duplicados
PositionSchema.index({ championshipId: 1, position: 1 }, { unique: true });

// Export
export const Position: ITenantModel<IPositionDocument> = model<IPositionDocument, IPositionModel>('Position', PositionSchema);
export default Position;