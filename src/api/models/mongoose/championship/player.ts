import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { CustomError } from "../../../errors";
import { Logger } from "../../../config";

const logger = new Logger();


// Interfaces
export interface IPlayerStats {
    gamesPlayed: number;
    points: number;
    assists: number;
    blocks: number;
    serves: number;
    aces: number;
}
export enum EPSProvider {
    SURA = 'sura',
    NUEVA_EPS = 'nueva_eps',
    SANITAS = 'sanitas',
    COMPENSAR = 'compensar',
    FAMISANAR = 'famisanar',
    SALUD_TOTAL = 'salud_total',
    ALIANSALUD = 'aliansalud',
    COOMEVA = 'coomeva',
    MEDIMAS = 'medimas',
    // Puedes agregar más según necesites
}
export enum IndoorVolleyballPosition {
    SETTER = 'SETTER',
    OUTSIDE = 'OUTSIDE',
    MIDDLE = 'MIDDLE',
    OPPOSITE = 'OPPOSITE',
    LIBERO = 'LIBERO'
}

export enum BeachVolleyballPosition {
    BLOCKER = 'BLOCKER',
    DEFENDER = 'DEFENDER',
}

export interface IPlayerDocument extends ITenantDocument {
    userId: Schema.Types.ObjectId;    // Referencia al usuario
    clubId: Schema.Types.ObjectId;
    teamId?: Schema.Types.ObjectId;
    position: IndoorVolleyballPosition | BeachVolleyballPosition;
    isIndependent: boolean;
    eps: EPSProvider;
    age?: number;
    number?: number;
    status: 'active' | 'inactive' | 'injured' | 'suspended';
    gender: 'male' | 'female';
    dateOfBirth?: Date;
    height?: number;
    weight?: number;
    dominantHand?: 'left' | 'right';
    nationality?: string;
    stats?: IPlayerStats;
    experience?: number;
    photo?: string;
    isTeamMember: boolean;           // Indica si el usuario tiene rol team_member
    memberSince?: Date;              // Fecha desde que es miembro
    lastActive?: Date;               // Última actividad como jugador
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPlayerModel extends ITenantModel<IPlayerDocument> {
    byTenant(tenant: string): ITenantModel<IPlayerDocument>;
}

// Schema
const PlayerStatsSchema = new Schema<IPlayerStats>({
    gamesPlayed: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    blocks: { type: Number, default: 0 },
    serves: { type: Number, default: 0 },
    aces: { type: Number, default: 0 }
}, { _id: false });

const PlayerSchema = new Schema<IPlayerDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true
        },
        clubId: {
            type: Schema.Types.ObjectId,
            ref: 'Club',
            required: false
        },
        teamId: {
            type: Schema.Types.ObjectId,
            ref: 'Team',
            required: false
        },
        eps: {
            type: String,
            enum: Object.values(EPSProvider),
            required: true
        },
        position: {
            type: String,
            required: true,
            enum: {
                values: ['BLOCKER', 'DEFENDER', 'SETTER', 'OUTSIDE', 'MIDDLE', 'OPPOSITE', 'LIBERO'],
                message: '{VALUE} is not a valid volleyball position'
            }
        },
        number: {
            type: Number,
            min: 1,
            max: 99,
            unique: false
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'injured', 'suspended'],
            default: 'active'
        },
        gender: {
            type: String,
            enum: ['male', 'female'],
            default: 'male'
        },
        dateOfBirth: {
            type: Date
        },
        height: {
            type: Number
        },
        weight: {
            type: Number
        },
        dominantHand: {
            type: String,
            enum: ['left', 'right']
        },
        nationality: {
            type: String
        },
        stats: {
            type: PlayerStatsSchema,
            default: () => ({})
        },
        isIndependent: {
            type: Boolean,
            default: false
        },
        experience: {
            type: Number
        },
        photo: {
            type: String
        },
        isTeamMember: {
            type: Boolean,
            default: false
        },
        memberSince: {
            type: Date
        },
        lastActive: {
            type: Date
        },
        deletedAt: {
            type: Date,
            default: null
        },

    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Índices
PlayerSchema.index({ status: 1 });


// Middleware pre-save para verificar rol de usuario
PlayerSchema.pre('save', async function (next) {
    try {
        if (this.isNew || this.isModified('userId')) {
            const User = model('User');
            const user = await User.findById(this.userId);

            if (!user) {
                throw new CustomError('User not found', 404, 'ValidationError');
            }

            // Agregar log para debug
            logger.info('User roles:', user.role);

            // Verificar si el usuario tiene el rol team_member
            const hasTeamMemberRole = Array.isArray(user.role)
                ? user.role.includes('team_member')
                : user.role === 'team_member';

            this.isTeamMember = hasTeamMemberRole;

            if (!hasTeamMemberRole) {
                throw new CustomError(
                    'User must have the team_member role to be registered as a player',
                    400,
                    'ValidationError'
                );
            }

            if (this.isNew) {
                this.memberSince = new Date();
            }
        }



        next();
    } catch (error: any) {
        next(error);
    }
});

// Virtual para calcular la edad
PlayerSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Plugins
PlayerSchema.plugin(mongoTenant);
PlayerSchema.plugin(mongoosePaginate);
PlayerSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Player: ITenantModel<IPlayerDocument> = model<IPlayerDocument, IPlayerModel>('Player', PlayerSchema);
export default Player;