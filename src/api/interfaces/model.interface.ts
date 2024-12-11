import { Model, Document, Types } from 'mongoose';

// Interfaz base para documentos
export interface IBaseDocument extends Document {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interfaz base para cualquier documento con tenant
export interface ITenantDocument extends IBaseDocument {
    tenant?: string;
    [key: string]: any; // Permite cualquier propiedad adicional
}

// Interfaz para modelos con método byTenant
export interface ITenantModel<T extends ITenantDocument> extends Model<T> {
    byTenant(tenant: string): Model<T>;
}

// Opciones de búsqueda genéricas
export interface FindOptions {
    select?: string[];
    throwError?: boolean;
    errorMessage?: string;
} 

//
export interface UpdateOptions extends FindOptions {
    runValidators?: boolean;
}