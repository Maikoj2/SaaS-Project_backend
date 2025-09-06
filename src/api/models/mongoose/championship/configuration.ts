import { model, Schema, Types } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import {  IChampionshipDocument } from "./championship";
import { IGameFormatDocument } from "./gameFormat";
import { GameFormatType, Gender } from "../../../constants/championshipStatus.constants";


// Interfaces
interface ITieBreakerCriteria {
    setRatio: boolean;
    pointRatio: boolean;
    draw: boolean;
}

export interface IConfigurationDocument extends ITenantDocument {
    championshipId:  Types.ObjectId | IChampionshipDocument;
    maxTeams: number;
    gender: Gender;
    courts: Types.ObjectId[];
    gameFormatId: Types.ObjectId | IGameFormatDocument;
    tieBreakerCriteria: ITieBreakerCriteria;
    customRules?: string;
    matchDurationLimit?: number;
    setDurationLimit?: number;
    registrationDeadline: Date;
    competitionType: GameFormatType;
    registrationFee: number;
    tournamentBracket?: any;
    matchFormatId: Schema.Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IConfigurationModel extends ITenantModel<IConfigurationDocument> {
    byTenant(tenant: string): ITenantModel<IConfigurationDocument>;
    
}

// Schema
// Criteria for tiebreaker in case of draw
const TieBreakerCriteriaSchema = new Schema<ITieBreakerCriteria>({
    setRatio: { 
        type: Boolean, 
        default: false 
    },
    pointRatio: { 
        type: Boolean, 
        default: false 
    },
    draw: { 
        type: Boolean, 
        default: false 
    }
}, { _id: false });

const ChampionshipConfigurationSchema = new Schema<IConfigurationDocument>(
    {
        championshipId: { 
            type: Schema.Types.ObjectId, 
            ref: 'Championship', 
            required: true 
        },
        maxTeams: { 
            type: Number, 
            required: true,
            min: 4,
            max: 48
        },
        courts: [{
            type: Schema.Types.ObjectId,
            ref: 'Court'
        }],
        gender: {
            type: String,
            enum: Object.values(Gender),
            required: true,
            default: Gender.MALE
        },
        competitionType: {
            type: String,
            enum: Object.values(GameFormatType),
            required: true,
            default: GameFormatType.GROUPS_AND_ELIMINATION
        },
        tournamentBracket: {
            type: Object,
            default: null
        },
        gameFormatId: {
            type: Schema.Types.ObjectId,
            ref: 'GameFormat',
            required: true
        },
        tieBreakerCriteria: {
            type: TieBreakerCriteriaSchema,
            required: true,
            default: () => ({
                setRatio: false,
                pointRatio: false,
                draw: false
            })
        },
        customRules: { 
            type: String     
        },
        matchDurationLimit: { 
            type: Number, 
            min: 0
        },
        setDurationLimit: { 
            type: Number, 
            min: 0
        },
        registrationDeadline: { 
            type: Date, 
            required: true,
            validate: {
                validator: function(this: IConfigurationDocument, deadline: Date) {
                    return deadline > new Date();
                },
                message: 'the registration deadline must be in the future'
            }
        },
        registrationFee: { 
            type: Number, 
            required: true,
            min: 0
        },
        matchFormatId: {
            type: Schema.Types.ObjectId,
            ref: 'MatchFormat',
            required: true
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
ChampionshipConfigurationSchema.index({ championshipId: 1 }, { unique: true });

// Middleware de validación
ChampionshipConfigurationSchema.pre('save', function(next) {
    if (this.matchDurationLimit && this.setDurationLimit) {
        if (this.matchDurationLimit < this.setDurationLimit) {
            next(new Error('the match duration limit must be greater than the set duration limit'));
        }
    }
    next();
});



// Plugins
ChampionshipConfigurationSchema.plugin(mongoTenant);
ChampionshipConfigurationSchema.plugin(mongoosePaginate);
ChampionshipConfigurationSchema.plugin(MongooseDelete, { overrideMethods: 'all', deletedAt: true });

// Export
export const ChampionshipConfiguration: ITenantModel<IConfigurationDocument> = model<IConfigurationDocument, IConfigurationModel>('ChampionshipConfiguration', ChampionshipConfigurationSchema);
export default ChampionshipConfiguration;

/* 

export class ChampionshipService {
    async createWithConfiguration(championshipData: any, configData: any) {
        try {
            // 1. Crear Championship
            const championship = new Championship({
                name: championshipData.name,
                numberOfTeams: championshipData.numberOfTeams,
                startDate: championshipData.startDate,
                endDate: championshipData.endDate,
                // ... otros datos del championship
            });
            await championship.save();

            // 2. Crear Configuration asociada
            const configuration = new Configuration({
                championshipId: championship._id,
                maxTeams: configData.maxTeams,
                formatType: configData.formatType,
                registrationDeadline: configData.registrationDeadline,
                registrationFee: configData.registrationFee,
                // ... otros datos de configuración
            });
            await configuration.save();

            return {
                championship,
                configuration
            };
        } catch (error) {
            // Si algo falla, revertir la creación del championship
            if (championship?._id) {
                await Championship.findByIdAndDelete(championship._id);
            }
            throw new Error(`Error creating championship with configuration: ${error.message}`);
        }
   

*/