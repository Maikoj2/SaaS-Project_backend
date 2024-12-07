import { Schema, model, Document, Model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import mongoTenant from 'mongo-tenant';
import mongooseDelete from 'mongoose-delete';

export interface IPluginFeatures {
    [key: string]: any;
}
interface ITenantModel<T> extends Model<T> {
    byTenant(tenant: string): this;
}

export interface IPlugin extends Document {
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

const PluginsSchema = new Schema<IPlugin>(
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

export const Plugin = model<IPlugin, ITenantModel<IPlugin>>('Plugins', PluginsSchema);