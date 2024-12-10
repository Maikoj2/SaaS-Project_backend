import { Model, Document } from 'mongoose';

export interface IBaseModel extends Document {
    name?: string;
    email?: string;
    role?: string;
    verified?: boolean;
    tenant?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Tipo para modelos con método byTenant
export interface ITenantModel<T extends IBaseModel> extends Model<T> {
    byTenant(tenant: string): Model<T>;
} 