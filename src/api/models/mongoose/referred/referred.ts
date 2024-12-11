import { model, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';
import mongoTenant from 'mongo-tenant';
import { ITenantDocument, ITenantModel } from '../../../interfaces/model.interface';

export interface IReferredDocument extends ITenantDocument {
    userTo: Types.ObjectId;
    userFrom: Types.ObjectId;
    status: 'available' | 'unavailable';
    amountFrom: number;
    amountTo: number;
}

export interface IReferredModel extends ITenantModel<IReferredDocument> {
    paginate: any;
    aggregatePaginate: any;
}

const ReferredSchema = new Schema(
    {
        userTo: {
            type: Types.ObjectId,
            required: true
        },
        userFrom: {
            type: Types.ObjectId,
            required: true
        },
        status: {
            type: String,
            enum: ['available', 'unavailable'],
            default: 'available'
        },
        amountFrom: {
            type: Number,
            required: true,
            default: 0
        },
        amountTo: {
            type: Number,
            required: true,
            default: 0
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Plugins
ReferredSchema.plugin(mongoosePaginate);
ReferredSchema.plugin(aggregatePaginate);
ReferredSchema.plugin(mongoTenant);

const ReferredModel = model<IReferredDocument, IReferredModel>('ReferredUser', ReferredSchema);
export default ReferredModel; 