import { Schema, model, Model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import mongoTenant from 'mongo-tenant';
import mongooseDelete from 'mongoose-delete';
import { ITenantDocument } from '../../../interfaces';

export interface IPluginFeatures {
    [key: string]: any;
}
interface IPluginModel<T> extends Model<IPluginDocument> {
    paginate: any;
    byTenant(tenant: string): this;
}

export interface IPluginDocument extends ITenantDocument {
    plugin: {
        path: string;
        name: string;
    };
    status: string;
    name: string;
    description: string;
    path: string;
    icon?: string;
    video?: string;
    features: IPluginFeatures;
    periodTry: number;
    createdAt: Date;
    updatedAt: Date;
}

const PluginsSchema = new Schema<IPluginDocument>(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true,
            unique: true
        },
        icon: {
            type: String,
            required: false
        },
        video: {
            type: String,
            required: false
        },
        features: {
            type: Object,
            required: true
        },
        periodTry: {
            type: Number,
            default: 0
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Plugins
PluginsSchema.plugin(mongoosePaginate);
PluginsSchema.plugin(mongoTenant);
PluginsSchema.plugin(mongooseDelete, { overrideMethods: 'all' });

export const Plugin = model<IPluginDocument, IPluginModel<IPluginDocument>>('Plugins', PluginsSchema);