import { Schema, model } from 'mongoose';
import { ITenantDocument, ITenantModel } from '../../../interfaces';
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interface del documento
export interface IInvitationLink extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    code: string;
    expiresAt: Date;
    isActive: boolean;
    maxUses: number;
    usedCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface del modelo
export interface IInvitationLinkModel extends ITenantModel<IInvitationLink> {
    byTenant(tenant: string): ITenantModel<IInvitationLink>;
}

// Schema
const InvitationLinkSchema = new Schema({
    championshipId: {
        type: Schema.Types.ObjectId,
        ref: 'Championship',
        required: true
    },
    code: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    maxUses: {
        type: Number,
        required: true
    },
    usedCount: {
        type: Number,
        default: 0
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, { 
    timestamps: true,
    versionKey: false 
});

// Plugins
InvitationLinkSchema.plugin(mongoTenant);
InvitationLinkSchema.plugin(mongoosePaginate);
InvitationLinkSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const InvitationLink: ITenantModel<IInvitationLink> = model<IInvitationLink, IInvitationLinkModel>('InvitationLink', InvitationLinkSchema);
export default InvitationLink;