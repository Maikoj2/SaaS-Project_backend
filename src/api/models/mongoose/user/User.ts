import { CallbackWithoutResultAndOptionalError, model, Schema, Model} from "mongoose";
import { customAlphabet } from "nanoid";
import { hash, genSalt, compare } from "bcryptjs";
import mongoosePaginate from "mongoose-paginate-v2";
import mongoTenant from "mongo-tenant";
import mongoose_delete from "mongoose-delete";
import { IUser, IUserMethods } from "../../../interfaces/IUser";
import { PasswordUtil } from "../../../utils";


export interface IUserDocument extends IUser, Document {}
export interface IUserModel extends Model<IUserDocument, {}, IUserMethods> {
    byTenant(tenant: string): IUserModel;
    save(): Promise<IUserDocument>;
}

const UserSchema = new Schema(
    {
        name: { type: String, required: true },
        lastName: { type: String, required: false },
        nie: { type: String, required: false },
        stepper: { type: Array, default: [] },
        email: {
            type: String,
            lowercase: true,
            unique: true,
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
            default: 'viewer'
        },
        verification: { type: String },
        verified: { type: Boolean, default: false },
        tag: { type: Array, default: [] },
        avatar: { type: String },
        description: { type: String },
        nameBusiness: { type: String },
        phone: { type: String, required: false },
        address: { type: Object, required: false },
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
        resetPasswordToken: { type: String },
        resetPasswordExpires: { type: Date }
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

const Hash = (user: any, salt: string, next: CallbackWithoutResultAndOptionalError) => {
    hash(user.password, salt, (error, newHash) => {
        if (error) {
            return next(error)
        }
        user.password = newHash
        return next()
    })
}

const GenSalt = (user: any, SALT_FACTOR: number, next: CallbackWithoutResultAndOptionalError) => {
    genSalt(SALT_FACTOR, (err, salt) => {
        if (err) {
            return next(err)
        }
        return Hash(user, salt, next)
    })
}

UserSchema.methods.comparePassword = function (passwordAttempt: any, cb: any) {
    return PasswordUtil.comparePassword(passwordAttempt, this.password);
}

// Plugins
UserSchema.plugin(mongoosePaginate);
UserSchema.plugin(mongoTenant);
UserSchema.plugin(mongoose_delete, { overrideMethods: 'all' });

const UserModel = model<IUserDocument, IUserModel>('User', UserSchema);
export default UserModel; 