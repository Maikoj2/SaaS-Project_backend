import { Model, Document, Types, PaginateModel, PaginateResult } from 'mongoose';

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
export interface ITenantModel<T extends ITenantDocument> extends Model<T>, PaginateModel<T> {
    byTenant(tenant: string): PaginateModel<T>;
    paginate(
        query?: any,
        options?: any,
        callback?: (err: any, result: PaginateResult<T>) => void
    ): Promise<PaginateResult<T>>;
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

export interface PaginationOptions {
    page?: number;
    limit?: number;
    sort?: Record<string, 1 | -1>;
    select?: string[];
}