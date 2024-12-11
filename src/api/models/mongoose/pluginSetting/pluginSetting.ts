import { model, Schema } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import mongoTenant from 'mongo-tenant';
import mongoose_delete from 'mongoose-delete';
import { ITenantDocument, ITenantModel } from '../../../interfaces/model.interface';

export interface IPluginSettingDocument extends ITenantDocument {
    plugin: {
        [key: string]: any;
    };
    status: 'enabled' | 'disabled';
    customData?: {
        [key: string]: any;
    };
}

export interface IPluginSettingModel extends ITenantModel<IPluginSettingDocument> {
    paginate: any;
}

const PluginSettingSchema = new Schema(
    {
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
            required: false
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Plugins
PluginSettingSchema.plugin(mongoosePaginate);
PluginSettingSchema.plugin(mongoTenant);
PluginSettingSchema.plugin(mongoose_delete, { overrideMethods: 'all' });

const PluginSettingModel = model<IPluginSettingDocument, IPluginSettingModel>('PluginsSettings', PluginSettingSchema);
export default PluginSettingModel; 