import { model, Schema } from "mongoose";
import { ITenantDocument, ITenantModel } from "../../../interfaces";
import MongooseDelete from 'mongoose-delete';
import mongoTenant from 'mongo-tenant';
import mongoosePaginate from 'mongoose-paginate-v2';
import { Types } from "mongoose";

// Interfaces
interface ITieBreakerCriteria {
    setRatio: boolean;
    pointRatio: boolean;
    draw: boolean;
}

interface ITablePointsPolicy {
    winPoints: number;
    lossPoints: number;
    walkoverLossPoints: number;
    walkoverWinPoints?: number;
}
interface IMatchRules {
    volleyballType: 'beach' | 'indoor';
    setsToWin: number;
    maxSets: number;
    regularSetPoints: number;
    tieBreakPoints: number;
    minimumPointDifference: number;
}
interface IEliminationSettings {
    enabled: boolean;

    qualificationMode: 'topPerGroup' | 'topPerGroupPlusBestThirds' | 'bestOverall';

    topPerGroup?: number;
    bestThirdsCount?: number;
    totalQualifiers?: number;

    bracketSeedingStrategy:
    | 'overallRanking'
    | 'crossGroup'
    | 'manual'
    | 'random';

    bracketSize?: 2 | 4 | 8 | 16 | 32;

    includeThirdPlaceMatch: boolean;

    initialMatchNumber?: number;

    autoGenerateAfterGroupStage: boolean;
    normalizeStandingsForUnevenGroups?: boolean;
}

export interface IConfigurationDocument extends ITenantDocument {
    championshipId: Types.ObjectId;
    maxTeams: number;
    gameFormatId: Types.ObjectId;
    tieBreakerCriteria: ITieBreakerCriteria;
    eliminationSettings: IEliminationSettings;
    matchRules: IMatchRules;
    customRules?: string;
    tablePointsPolicy?: ITablePointsPolicy;
    distributionStrategy?: string;
    matchDurationLimit?: number;
    setDurationLimit?: number;
    registrationDeadline: Date;
    registrationFee: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IConfigurationModel extends ITenantModel<IConfigurationDocument> {
    byTenant(tenant: string): ITenantModel<IConfigurationDocument>;
    findByChampionship(championshipId: string): Promise<IConfigurationDocument>;
}

// Schema
const TablePointsPolicySchema = new Schema<ITablePointsPolicy>({
    winPoints: {
        type: Number,
        required: true,
        default: 2
    },
    lossPoints: {
        type: Number,
        required: true,
        default: 1
    },
    walkoverLossPoints: {
        type: Number,
        required: true,
        default: 0
    },
    walkoverWinPoints: {
        type: Number,
        required: false
    }
}, { _id: false });

const EliminationSettingsSchema = new Schema(
    {
        enabled: {
            type: Boolean,
            default: true,
        },
        qualificationMode: {
            type: String,
            enum: [
                'topPerGroup',
                'topPerGroupPlusBestThirds',
                'topPerGroupPlusBestRemaining',
                'bestOverall',
            ],
            default: 'topPerGroup',
        },
        topPerGroup: {
            type: Number,
            default: 2,
        },
        bestThirdsCount: {
            type: Number,
            default: 0,
        },
        totalQualifiers: {
            type: Number,
            required: false,
        },
        normalizeStandingsForUnevenGroups: {
            type: Boolean,
            default: true,
        },
        bracketSeedingStrategy: {
            type: String,
            enum: ['overallRanking', 'crossGroup', 'manual', 'random'],
            default: 'overallRanking',
        },
        bracketSize: {
            type: Number,
            enum: [2, 4, 8, 16, 32],
            required: false,
        },
        includeThirdPlaceMatch: {
            type: Boolean,
            default: true,
        },
        initialMatchNumber: {
            type: Number,
            default: 1,
        },
        autoGenerateAfterGroupStage: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);
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

const MatchRulesSchema = new Schema<IMatchRules>({
    volleyballType: {
        type: String,
        enum: ['beach', 'indoor'],
        required: true,
        default: 'beach'
    },
    setsToWin: {
        type: Number,
        required: true,
        default: 2
    },
    maxSets: {
        type: Number,
        required: true,
        default: 3
    },
    regularSetPoints: {
        type: Number,
        required: true,
        default: 21
    },
    tieBreakPoints: {
        type: Number,
        required: true,
        default: 15
    },
    minimumPointDifference: {
        type: Number,
        required: true,
        default: 2
    }
}, { _id: false });

const ChampionshipConfigurationSchema = new Schema<IConfigurationDocument>(
    {
        championshipId: {
            type: Types.ObjectId,
            ref: 'Championship',
            required: true
        },
        maxTeams: {
            type: Number,
            required: true,
            min: 2
        },
        gameFormatId: {
            type: Types.ObjectId,
            ref: 'GameFormat',
            required: true
        },
        matchRules: {
            type: MatchRulesSchema,
            required: true,
            default: () => ({
                volleyballType: 'beach',
                setsToWin: 2,
                maxSets: 3,
                regularSetPoints: 21,
                tieBreakPoints: 15,
                minimumPointDifference: 2
            })
        },
        eliminationSettings: {
            type: EliminationSettingsSchema,
            required: true,
            default: () => ({
                enabled: true,
                qualificationMode: 'topPerGroup',
                topPerGroup: 2,
                bestThirdsCount: 0,
                bracketSeedingStrategy: 'overallRanking',
                includeThirdPlaceMatch: true,
                initialMatchNumber: 1,
                autoGenerateAfterGroupStage: false,
            }),
        },
        distributionStrategy: {
            type: String,
            enum: ['serpentine', 'linear', 'random', 'balancedByClub'],
            default: 'serpentine'
        },
        tablePointsPolicy: {
            type: TablePointsPolicySchema,
            required: true,
            default: () => ({
                winPoints: 2,
                lossPoints: 1,
                walkoverLossPoints: 0
            })
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
                validator: function (this: IConfigurationDocument, deadline: Date) {
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
ChampionshipConfigurationSchema.pre('save', function (next) {
    if (this.matchDurationLimit && this.setDurationLimit) {
        if (this.matchDurationLimit < this.setDurationLimit) {
            next(new Error('the match duration limit must be greater than the set duration limit'));
        }
    }
    next();
});

// Métodos estáticos
ChampionshipConfigurationSchema.statics.findByChampionship = function (championshipId: string) {
    return this.findOne({ championshipId }).populate('championshipId');
};

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