import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface IPlayerStats {
    gamesPlayed: number;
    points: number;
    assists: number;
    blocks: number;
    serves: number;
    aces: number;
}

export interface IPlayerDocument extends ITenantDocument {
    userId: Schema.Types.ObjectId;    // Referencia al usuario
    teamId: Schema.Types.ObjectId;
    name: string;
    position: string;
    number?: number;
    status: 'active' | 'inactive' | 'injured' | 'suspended';
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
    findActiveByTeam(teamId: string): Promise<IPlayerDocument[]>;
    updateStats(playerId: string, stats: Partial<IPlayerStats>): Promise<IPlayerDocument>;
    findByUserId(userId: string): Promise<IPlayerDocument>;
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
        teamId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Team', 
            required: true 
        },
        name: { 
            type: String, 
            required: true 
        },
        position: { 
            type: String, 
            required: true,
            enum: ['setter', 'outside', 'middle', 'opposite', 'libero']
        },
        number: {
            type: Number,
            min: 1,
            max: 99
        },
        status: { 
            type: String, 
            enum: ['active', 'inactive', 'injured', 'suspended'], 
            default: 'active' 
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
        }
    },
    {
        versionKey: false,
        timestamps: true
    }
);

// Índices
PlayerSchema.index({ teamId: 1, status: 1 });
PlayerSchema.index({ teamId: 1, number: 1 }, { unique: true });
PlayerSchema.index({ userId: 1 }, { unique: true });

// Middleware pre-save para verificar rol de usuario
PlayerSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('userId')) {
        try {
            const User = model('User');
            const user = await User.findById(this.userId);
            if (!user) {
                throw new Error('Usuario no encontrado');
            }
            
            // Verificar si el usuario tiene el rol team_member
            const hasTeamMemberRole = user.roles.includes('team_member');
            this.isTeamMember = hasTeamMemberRole;
            
            if (!hasTeamMemberRole) {
                throw new Error('El usuario debe tener el rol team_member');
            }

            if (this.isNew) {
                this.memberSince = new Date();
            }
        } catch (error: any) {
            next(error);
        }
    }
    next();
});

// Métodos estáticos
PlayerSchema.statics.findActiveByTeam = function(teamId: string) {
    return this.find({ 
        teamId: teamId,
        status: 'active'
    }).populate('userId', 'email name roles');
};

PlayerSchema.statics.updateStats = async function(playerId: string, newStats: Partial<IPlayerStats>) {
    return this.findByIdAndUpdate(
        playerId,
        { 
            $inc: newStats,
            lastActive: new Date()
        },
        { new: true }
    );
};

PlayerSchema.statics.findByUserId = function(userId: string) {
    return this.findOne({ userId }).populate('teamId');
};

// Virtual para calcular la edad
PlayerSchema.virtual('age').get(function() {
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