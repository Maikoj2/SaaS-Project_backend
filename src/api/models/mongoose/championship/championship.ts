import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { ChampionshipStatus } from "../../../constants/championshipStatus.constants";

export enum ChampionshipType {
    INDOOR = 'indoor',
    BEACH = 'beach'
}
export interface IChampionshipDocument extends ITenantDocument {
    type: ChampionshipType;
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    status: ChampionshipStatus ;
    phases: Types.ObjectId[];
    teams: Types.ObjectId[];
    matches: Types.ObjectId[];
    registrations: Types.ObjectId[];
    idCreatorChampionship: Types.ObjectId;
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
        type: {
            type: String,
            enum: ChampionshipType,
            required: true
        },
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
            enum: ChampionshipStatus,
            default: 'draft'
        },
        phases: [{
            type: Types.ObjectId,
            ref: 'Phase'
        }],
        teams: [{
            type: Types.ObjectId,
            ref: 'Team'
        }],
        courts: [{
            type: Types.ObjectId,
            ref: 'Court'
        }],
        matches: [{
            type: Types.ObjectId,
            ref: 'Match'
        }],
        registrations: [{
            type: Types.ObjectId,
            ref: 'Registration'
        }],
        idCreatorChampionship: {
            type: Types.ObjectId,
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