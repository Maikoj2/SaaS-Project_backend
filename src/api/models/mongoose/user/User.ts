import { CallbackWithoutResultAndOptionalError, model, Schema } from "mongoose";
import { customAlphabet } from "nanoid";
import { hash, genSalt } from "bcryptjs";
import mongoosePaginate from "mongoose-paginate-v2";
import mongoTenant from "mongo-tenant";
import mongoose_delete from "mongoose-delete";
import { PasswordUtil } from "../../../utils";
import { ITenantDocument, ITenantModel } from '../../../interfaces/model.interface';
import { AuthRole } from "../../../constants/apiRoutes";
import { email } from "envalid";
import { trim } from "validator";

export interface IUserDocument extends ITenantDocument {
    name: string;
    lastName?: string;
    nie?: string;
    stepper: any[];
    email: string;
    password: string;
    role: AuthRole;
    verification?: string;
    verified: boolean;
    tag: any[];
    avatar?: string;
    description?: string;
    nameBusiness?: string;
    phone?: string;
    address?: IAddress;
    loginAttempts: number;
    blockExpires: Date;
    socialNetwork: any[];
    referredCode?: string;
    createFromRegistration?: boolean;
    dummy?: boolean;
    mustChangePassword?: boolean;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    comparePassword(passwordAttempt: string): Promise<boolean>;
}

export interface IUserModel extends ITenantModel<IUserDocument> {
    paginate: any;
    byTenant(tenant: string): ITenantModel<IUserDocument>;
}
// Definir la interfaz para la dirección
export interface IAddress {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    state?: string;
}

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        lastName: { type: String, required: false },
        nie: { type: String, required: false, trim: true, unique: true, uppercase: true },
        stepper: { type: Array, default: [] },
        email: {
            type: String,
            lowercase: true,
            unique: true, trim: true,
            required: true
        },
        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ['admin', 'organizer', 'referee', 'team_member', 'viewer'],
            default: 'admin'
        },
        verification: { type: String },
        verified: { type: Boolean, default: false },
        tag: { type: Array, default: [] },
        avatar: { type: String },
        description: { type: String },
        nameBusiness: { type: String },
        phone: { type: String, required: false },
        address: {
            type: {
                street: { type: String, default: '' },
                city: { type: String, default: '' },
                country: { type: String, default: '' },
                postalCode: { type: String, default: '' },
                department: { type: String, default: '' }
            },
            required: false,
            _id: false
        },
        mustChangePassword: { type: Boolean, default: false },
        createFromRegistration: { type: Boolean, default: false },
        loginAttempts: { type: Number, default: 0, select: false },
        blockExpires: { type: Date, default: Date.now, select: false, nullable: true },
        socialNetwork: { type: Array },
        referredCode: {
            type: String,
            unique: true,
            required: true,
            default: () => customAlphabet('KA1234567890', 8)()
        },
        dummy: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null }
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

//indices
UserSchema.index(
    {
        tenantId: 1,
        nie: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            nie: {
                $type: 'string',
                $ne: '',
            },
        },
    }
);


// Plugins
UserSchema.plugin(mongoosePaginate);
UserSchema.plugin(mongoTenant);
UserSchema.plugin(mongoose_delete, { overrideMethods: 'all', deletedAt: true });

const UserModel = model<IUserDocument, IUserModel>('User', UserSchema);
export default UserModel; 