import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

// Interfaces
export interface ITeamDistribution {
    teamId: Types.ObjectId;
    position: number;
    group: string;
}

export interface IGroupDistributionDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    name: string;
    teams: number;
    groups: number;
    distribution: {
        [key: string]: ITeamDistribution[];
    };
    formatType: 'serpentine' | 'linear' | 'random' | 'balancedByClub' | 'custom';
    customRules?: string;
    status: 'draft' | 'active' | 'completed';
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

export interface IGroupDistributionModel extends ITenantModel<IGroupDistributionDocument> {
    byTenant(tenant: string): ITenantModel<IGroupDistributionDocument>;
    findByChampionship(championshipId: string): Promise<IGroupDistributionDocument[]>;
    updateDistribution(
        id: string,
        distribution: { [key: string]: ITeamDistribution[] }
    ): Promise<IGroupDistributionDocument>;
}

// Schema para la distribución de equipos
const TeamDistributionSchema = new Schema(
    {
        teamId: {
            type: Types.ObjectId,
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
    },
    { _id: false }
);

const GroupDistributionSchema = new Schema<IGroupDistributionDocument>(
    {
        championshipId: {
            type: Types.ObjectId,
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
            enum: ['serpentine', 'linear', 'random', 'balancedByClub', 'custom'],
            default: 'serpentine'
        },
        customRules: {
            type: String,
            default: ''
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

// Helpers
function getDistributionValues(
    distribution: IGroupDistributionDocument['distribution'] | Map<string, ITeamDistribution[]> | undefined | null
): ITeamDistribution[][] {
    if (!distribution) {
        return [];
    }

    if (distribution instanceof Map) {
        return Array.from(distribution.values()).filter(Array.isArray);
    }

    return Object.values(distribution).filter(Array.isArray);
}

function countTeamsInDistribution(
    distribution: IGroupDistributionDocument['distribution'] | Map<string, ITeamDistribution[]> | undefined | null
): number {
    return getDistributionValues(distribution).reduce(
        (sum, groupTeams) => sum + groupTeams.length,
        0
    );
}

// Validaciones
GroupDistributionSchema.pre('save', function (next) {
    if (!this.distribution) {
        next(new Error('La distribución es requerida'));
        return;
    }

    const totalTeams = countTeamsInDistribution(this.distribution as any);

    if (totalTeams !== this.teams) {
        next(
            new Error(
                `La distribución debe contener exactamente ${this.teams} equipos, contiene ${totalTeams}`
            )
        );
        return;
    }

    if (this.groups < 2) {
        next(new Error('La distribución debe tener al menos 2 grupos'));
        return;
    }

    next();
});

// Métodos estáticos
GroupDistributionSchema.statics.findByChampionship = function (championshipId: string) {
    return this.find({ championshipId }).sort('createdAt');
};

GroupDistributionSchema.statics.updateDistribution = function (
    id: string,
    distribution: { [key: string]: ITeamDistribution[] }
) {
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
    if (!this.groups) return 0;

    return this.teams / this.groups;
});

GroupDistributionSchema.virtual('isComplete').get(function () {
    const totalTeams = countTeamsInDistribution(this.distribution as any);

    return totalTeams === this.teams;
});

// Plugins
GroupDistributionSchema.plugin(mongoTenant);
GroupDistributionSchema.plugin(mongoosePaginate);
GroupDistributionSchema.plugin(MongooseDelete, {
    overrideMethods: 'all',
    deletedAt: true
});

// Export
export const GroupDistribution: ITenantModel<IGroupDistributionDocument> =
    model<IGroupDistributionDocument, IGroupDistributionModel>(
        'GroupDistribution',
        GroupDistributionSchema
    );

export default GroupDistribution;