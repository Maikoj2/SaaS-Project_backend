export enum ChampionshipStatus {
    DRAFT = 'draft',
    REGISTRATION = 'registration',
    ACTIVE = 'active',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}
export enum PhaseStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    SCHEDULED = 'scheduled',
    CANCELLED = 'cancelled'
}   

export enum GameFormatType {
    SIMPLE = 'elimination_simple',
    DOUBLE = 'elimination_double',
    GROUPS = 'groups',
    GROUPS_AND_ELIMINATION = 'groups_and_elimination',
    LEAGUE = 'league',
    SWISS = 'swiss'


}
export enum GroupDistributionFormatType {
    SERPENTINE = 'serpentine',
    LINEAR = 'linear',
    RANDOM = 'random',
    CUSTOM = 'custom'
}

export enum GroupDistributionStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    COMPLETED = 'completed'
}

export enum GroupStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed'
}
export enum MatchStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
}
export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    MIXED = 'mixed'
}
