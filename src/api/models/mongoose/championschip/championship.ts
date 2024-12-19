import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface IChampionshipDocument extends ITenantDocument {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
    phases: Schema.Types.ObjectId[];
    teams: Schema.Types.ObjectId[];
    courts: Schema.Types.ObjectId[];
    matches: Schema.Types.ObjectId[];
    registrations: Schema.Types.ObjectId[];
    idCreatorChampionship: Schema.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IChampionshipModel extends ITenantModel<IChampionshipDocument> {
    byTenant(tenant: string): ITenantModel<IChampionshipDocument>;
    findWithPhases(id: string): Promise<IChampionshipDocument>;
    findWithTeams(id: string): Promise<IChampionshipDocument>;
    findWithMatches(id: string): Promise<IChampionshipDocument>;
}

const ChampionshipSchema = new Schema<IChampionshipDocument>(
    {
        name: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['draft', 'registration', 'active', 'completed', 'cancelled'],
            default: 'draft'
        },
        phases: [{
            type: Schema.Types.ObjectId,
            ref: 'Phase'
        }],
        teams: [{
            type: Schema.Types.ObjectId,
            ref: 'Team'
        }],
        courts: [{
            type: Schema.Types.ObjectId,
            ref: 'Court'
        }],
        matches: [{
            type: Schema.Types.ObjectId,
            ref: 'Match'
        }],
        registrations: [{
            type: Schema.Types.ObjectId,
            ref: 'Registration'
        }],
        idCreatorChampionship: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// Índices
ChampionshipSchema.index({ name: 1 });
ChampionshipSchema.index({ status: 1 });
ChampionshipSchema.index({ startDate: 1, endDate: 1 });

// Validaciones
ChampionshipSchema.pre('save', function(next) {
    if (this.registrationDeadline > this.startDate) {
        next(new Error('Registration deadline must be before start date'));
        return;
    }
    if (this.registrationStartDate > this.registrationDeadline) {
        next(new Error('Registration start date must be before deadline'));
        return;
    }

    next();
});

// Métodos estáticos
ChampionshipSchema.statics.findWithPhases = function(id: string) {
    return this.findById(id)
        .populate({
            path: 'phases',
            populate: [
                {
                    path: 'groups',
                    populate: {
                        path: 'teams'
                    }
                },
                {
                    path: 'matches',
                    populate: ['homeTeamId', 'awayTeamId']
                },
                'gameFormat'
            ]
        });
};

ChampionshipSchema.statics.findWithTeams = function(id: string) {
    return this.findById(id)
        .populate({
            path: 'teams',
            populate: {
                path: 'players'
            }
        });
};

ChampionshipSchema.statics.findWithMatches = function(id: string) {
    return this.findById(id)
        .populate({
            path: 'matches',
            populate: [
                { path: 'homeTeamId' },
                { path: 'awayTeamId' },
                { path: 'courtId' },
                { path: 'statistics' }
            ]
        });
};

// Virtuals
ChampionshipSchema.virtual('currentPhase').get(async function() {
    if (!this.phases?.length) return null;
    await this.populate('phases');
    return this.phases.find((phase:any) => phase.status === 'in_progress');
});

ChampionshipSchema.virtual('progress').get(function() {
    if (this.status === 'completed') return 100;
    if (this.status === 'draft') return 0;
    
    const total = (this.endDate.getTime() - this.startDate.getTime());
    const current = (new Date().getTime() - this.startDate.getTime());
    return Math.min(Math.max(Math.round((current / total) * 100), 0), 100);
});

// Plugins
ChampionshipSchema.plugin(mongoTenant);
ChampionshipSchema.plugin(mongoosePaginate);
ChampionshipSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const Championship: ITenantModel<IChampionshipDocument> = model<IChampionshipDocument, IChampionshipModel>('Championship', ChampionshipSchema);
export default Championship;