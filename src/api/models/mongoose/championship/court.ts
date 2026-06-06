import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface ICourtDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    name: string;
    type: 'indoor' | 'beach';
    status: 'available' | 'occupied' | 'maintenance';
    capacity: number;
    location?: string;           // Ubicación específica de la cancha
    dimensions?: string;         // Dimensiones de la cancha
    surface?: string;           // Tipo de superficie
    amenities?: string[];       // Servicios disponibles
    maintenanceHistory?: {      // Historial de mantenimiento
        date: Date;
        description: string;
        technician?: string;
    }[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICourtModel extends ITenantModel<ICourtDocument> {
    byTenant(tenant: string): ITenantModel<ICourtDocument>;
    findAvailable(): Promise<ICourtDocument[]>;
}

// Schema
const MaintenanceSchema = new Schema({
    date: { type: Date, required: true },
    description: { type: String, required: true },
    technician: { type: String }
}, { _id: false });

const CourtSchema = new Schema<ICourtDocument>(
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
        type: {
            type: String,
            enum: ['indoor', 'beach'],
            required: true
        },
        status: {
            type: String,
            enum: ['available', 'occupied', 'maintenance'],
            default: 'available'
        },
        capacity: { 
            type: Number, 
            required: true 
        },
        location: {
            type: String
        },
        dimensions: {
            type: String
        },
        surface: {
            type: String
        },
        amenities: [{
            type: String
        }],
        maintenanceHistory: [MaintenanceSchema],
        deletedAt: { 
            type: Date, 
            default: null 
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Índices
CourtSchema.index({ championshipId: 1, status: 1 });
CourtSchema.index({ name: 1 }, { unique: true });

// Métodos estáticos
CourtSchema.statics.findAvailable = function() {
    return this.find({ status: 'available' });
};

// Plugins
CourtSchema.plugin(mongoTenant);
CourtSchema.plugin(mongoosePaginate);
CourtSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Court: ITenantModel<ICourtDocument> = model<ICourtDocument, ICourtModel>('Court', CourtSchema);
export default Court;