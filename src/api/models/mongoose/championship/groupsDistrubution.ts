import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface ITeamDistribution {
    teamId: Schema.Types.ObjectId;
    position: number;
    group: string;
}

export interface IGroupDistributionDocument extends ITenantDocument {
    championshipId: Schema.Types.ObjectId;
    name: string;
    teams: number;
    groups: number;
    distribution: {
        [key: string]: ITeamDistribution[];
    };
    formatType: 'serpentine' | 'linear' | 'random' | 'custom';
    customRules?: string;
    status: 'draft' | 'active' | 'completed';
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface IGroupDistributionModel extends ITenantModel<IGroupDistributionDocument> {
    byTenant(tenant: string): ITenantModel<IGroupDistributionDocument>;
    findByChampionship(championshipId: string): Promise<IGroupDistributionDocument[]>;
    updateDistribution(id: string, distribution: { [key: string]: ITeamDistribution[] }): Promise<IGroupDistributionDocument>;
}

// Schema para la distribución de equipos
const TeamDistributionSchema = new Schema({
    teamId: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    position: {
        type: Number,
        required: true,
        min: 1
    },
    group: {
        type: String,
        required: true
    }
}, { _id: false });

const GroupDistributionSchema = new Schema<IGroupDistributionDocument>(
    {
        championshipId: {
            type: Schema.Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        teams: {
            type: Number,
            required: true,
            min: 2
        },
        groups: {
            type: Number,
            required: true,
            min: 2
        },
        distribution: {
            type: Map,
            of: [TeamDistributionSchema],
            required: true,
            default: {}
        },
        formatType: {
            type: String,
            enum: ['serpentine', 'linear', 'random', 'custom'],
            default: 'serpentine'
        },
        customRules: {
            type: String
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'completed'],
            default: 'draft'
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
GroupDistributionSchema.index({ championshipId: 1 });
GroupDistributionSchema.index({ status: 1 });

// Validaciones
GroupDistributionSchema.pre('save', function (next) {
    // Validar que el número de equipos sea divisible por el número de grupos
    if (this.teams % this.groups !== 0) {
        next(new Error('El número de equipos debe ser divisible por el número de grupos'));
        return;
    }

    // Validar que la distribución tenga el número correcto de equipos
    if (this.distribution) {
        const totalTeams = Object.values(this.distribution)
            .reduce((sum, group) => sum + group.length, 0);
        if (totalTeams > this.teams) {
            next(new Error('La distribución contiene más equipos que los especificados'));
            return;
        }
    }

    next();
});

// Métodos estáticos
GroupDistributionSchema.statics.findByChampionship = function (championshipId: string) {
    return this.find({ championshipId })
        .populate('distribution.$.teamId')
        .sort('createdAt');
};

GroupDistributionSchema.statics.updateDistribution = function (id: string, distribution: { [key: string]: ITeamDistribution[] }) {
    return this.findByIdAndUpdate(
        id,
        {
            $set: { distribution },
            status: 'active'
        },
        { new: true }
    );
};

// Virtuals
GroupDistributionSchema.virtual('teamsPerGroup').get(function () {
    return this.teams / this.groups;
});

GroupDistributionSchema.virtual('isComplete').get(function () {
    if (!this.distribution) return false;
    const totalTeams = Object.values(this.distribution)
        .reduce((sum, group) => sum + group.length, 0);
    return totalTeams === this.teams;
});

// Plugins
GroupDistributionSchema.plugin(mongoTenant);
GroupDistributionSchema.plugin(mongoosePaginate);
GroupDistributionSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const GroupDistribution: ITenantModel<IGroupDistributionDocument> = model<IGroupDistributionDocument, IGroupDistributionModel>('GroupDistribution', GroupDistributionSchema);
export default GroupDistribution;