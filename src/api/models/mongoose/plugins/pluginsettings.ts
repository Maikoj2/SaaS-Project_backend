import { Schema, model } from 'mongoose';
import { ITenantDocument, ITenantModel } from '../../../interfaces';
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IPluginSetting extends ITenantDocument {
    plugin: {
        name: string;
        version?: string;
        [key: string]: any;
    };
    status: 'enabled' | 'disabled';
    customData?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPluginSettingModel extends ITenantModel<IPluginSetting> {
    byTenant(tenant: string): ITenantModel<IPluginSetting>;
}

// Schema
const PluginSettingSchema = new Schema<IPluginSetting>({
    plugin: {
        type: Object,
        required: true
    },
    status: {
        type: String,
        enum: ['enabled', 'disabled'],
        default: 'enabled'
    },
    customData: {
        type: Object,
        default: {}
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    versionKey: false,
    timestamps: true
});

// Plugins
PluginSettingSchema.plugin(mongoTenant);
PluginSettingSchema.plugin(mongoosePaginate);
PluginSettingSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const PluginSetting: ITenantModel<IPluginSetting> = model<IPluginSetting, IPluginSettingModel>('PluginsSettings', PluginSettingSchema);
export default PluginSetting;