export type CompetitionTeam = {
    id: string;
    name: string;
    clubId?: string;
    clubName?: string;
    seed?: number;
};

export type CompetitionTeamSlot = {
    team: CompetitionTeam;
    position: number;
    positionLabel: string;
};

export type CompetitionGroup = {
    name: string;
    teams: CompetitionTeam[];
};

export type DistributionStrategy =
    | 'serpentine'
    | 'linear'
    | 'random'
    | 'balancedByClub'
    | 'manual';

export type GroupSizePreference =
    | 'preferGroupsOf3'
    | 'preferGroupsOf4'
    | 'preferGroupsOf5';

export type DistributionOptions = {
    strategy: DistributionStrategy;

    /**
     * Si se envía, fuerza la cantidad de grupos.
     * Ejemplo:
     * 12 equipos + numberOfGroups: 4 => 4 grupos de 3.
     */
    numberOfGroups?: number;

    /**
     * Tamaño máximo por grupo.
     * Por defecto: 4.
     */
    maxTeamsPerGroup?: number;

    /**
     * Para casos con varias opciones válidas.
     * Ejemplo:
     * 12 equipos:
     * - preferGroupsOf4 => 3 grupos de 4
     * - preferGroupsOf3 => 4 grupos de 3
     *
     * 20 equipos:
     * - preferGroupsOf4 => 5 grupos de 4
     * - preferGroupsOf5 => 4 grupos de 5
     */
    groupSizePreference?: GroupSizePreference;

    /**
     * Si está activo, el motor intenta detectar/reducir equipos
     * del mismo club dentro de un mismo grupo.
     */
    avoidSameClub?: boolean;

    /**
     * Límite mínimo configurable.
     * Por defecto será 8.
     */
    minTeams?: number;

    /**
     * Límite máximo configurable.
     * Por defecto será 32.
     * Si después quieres torneos de 48, puedes enviar maxTeams: 48.
     */
    maxTeams?: number;
};

export type GroupPlan = {
    numberOfGroups: number;
    groupSizes: number[];
};

export type DistributionWarningCode =
    | 'SAME_CLUB_IN_GROUP'
    | 'UNBALANCED_GROUPS'
    | 'INVALID_TEAM_COUNT'
    | 'INVALID_GROUP_COUNT'
    | 'MANUAL_DISTRIBUTION_INCOMPLETE';

export type DistributionWarning = {
    code: DistributionWarningCode;
    message: string;
    teamId?: string;
    groupName?: string;
};

export type DistributionResult = {
    groups: CompetitionGroup[];
    groupPlan: GroupPlan;
    warnings: DistributionWarning[];
};

export type CompetitionTeamDistribution = {
    teamId: string;
    position: number;
    group: string;
};

export type CompetitionDistributionMap = {
    [groupName: string]: CompetitionTeamDistribution[];
};

export type SetResult = {
    setNumber: number;
    teamAScore: number;
    teamBScore: number;
};

export type MatchStatus =
    | 'scheduled'
    | 'in_progress'
    | 'finished'
    | 'walkover'
    | 'cancelled';

export type CompetitionMatch = {
    id?: string;
    matchNumber: number;
    roundNumber?: number;
    phaseId?: string;
    groupName?: string;
    teamA: CompetitionTeam;
    teamB: CompetitionTeam;
    sets?: SetResult[];
    winnerId?: string;
    status: MatchStatus;

    court?: string;
    date?: string;
    time?: string;
};

export type Standing = {
    team: CompetitionTeam;

    // Partidos
    PJ: number;
    PG: number;
    PP: number;
    WO: number;

    // Sets
    SF: number;
    SC: number;
    CS: number;

    // Tantos / puntos de juego
    TF: number;
    TC: number;
    CT: number;

    // Puntos de tabla
    PTS: number;

    // Posición en tabla
    POS?: number;
};

/************************************* */

export type FixtureOptions = {
    initialMatchNumber?: number;
    includeRoundNumber?: boolean;
};

export type FixtureResult = {
    matches: CompetitionMatch[];
    totalMatches: number;
};

/************************************* */
export type Court = {
    id: string;
    name: string;
};

export type CourtSchedulingOptions = {
    courts: Court[];

    /**
     * Si se envía, cada turno representa una hora.
     * Ejemplo: "08:00", "09:00", "10:00"
     */
    startTime?: string;

    /**
     * Duración estimada del partido en minutos.
     * Ejemplo: 45, 60, 90.
     */
    matchDurationMinutes?: number;

    /**
     * Descanso entre partidos en minutos.
     */
    breakMinutes?: number;

    /**
     * Fecha del fixture.
     * Ejemplo: "2026-07-08"
     */
    date?: string;

    /**
     * Si es true, intenta no poner al mismo equipo
     * a jugar dos turnos seguidos.
     */
    avoidBackToBackMatches?: boolean;
};

export type ScheduledMatch = CompetitionMatch & {
    court: string;
    courtId: string;
    slotNumber: number;
    date?: string;
    time?: string;
};

export type CourtScheduleResult = {
    matches: ScheduledMatch[];
    totalMatches: number;
    totalSlots: number;
};
/**************************************** */
export type MatchResultSummary = {
    teamAId: string;
    teamBId: string;

    teamASetsWon: number;
    teamBSetsWon: number;

    teamAPoints: number;
    teamBPoints: number;

    winnerId: string;
    loserId: string;

    isWalkover: boolean;
    walkoverLoserId?: string;
};

export type MatchResultInput = {
    match: CompetitionMatch;
    sets: SetResult[];
    rules?: VolleyballMatchRules;
    walkoverWinnerId?: string;
};

export type VolleyballType = 'beach' | 'indoor';

export type VolleyballMatchRules = {
    volleyballType: VolleyballType;

    /**
     * Sets necesarios para ganar el partido.
     * Playa: 2
     * Piso: 3
     */
    setsToWin: number;

    /**
     * Máximo de sets permitidos.
     * Playa: 3
     * Piso: 5
     */
    maxSets: number;

    /**
     * Puntos objetivo para sets normales.
     * Playa: 21
     * Piso: 25
     */
    regularSetPoints: number;

    /**
     * Puntos objetivo para tie break.
     * Playa: 15
     * Piso: 15
     */
    tieBreakPoints: number;

    /**
     * Diferencia mínima para ganar un set.
     * Normalmente: 2
     */
    minimumPointDifference: number;
};

/* *****************Standing***************** */

export type TablePointsPolicy = {
    winPoints: number;
    lossPoints: number;
    walkoverLossPoints: number;
    walkoverWinPoints?: number;
};

export type StandingsOptions = {
    rules?: VolleyballMatchRules;
    pointsPolicy?: TablePointsPolicy;
};

export type GroupStandingsResult = {
    groupName: string;
    standings: Standing[];
};


/* *************** Qualification **************** */

export type QualificationMode =
    | 'topPerGroup'
    | 'topPerGroupPlusBestThirds'
    | 'topPerGroupPlusBestRemaining'
    | 'bestOverall';

export type QualificationOptions = {
    mode: QualificationMode;

    /**
     * Cuántos clasifican directamente por grupo.
     * Ejemplo:
     * 2 => clasifican primero y segundo de cada grupo.
     */
    topPerGroup?: number;

    /**
     * Cuántos mejores terceros clasifican.
     * Ejemplo:
     * 4 => clasifican los 4 mejores terceros.
     */
    bestThirdsCount?: number;

    /**
     * Cuántos clasifican en tabla general.
     * Ejemplo:
     * 8 => clasifican los mejores 8 sin importar grupo.
     */
    totalQualifiers?: number;

    /**
     * Normaliza los puntos de los terceros para que no sea
     * unfair para los que tuvieron un partido menos.
     * Por defecto será false.
     */
    normalizeStandingsForUnevenGroups?: boolean;
};

export type QualifiedTeam = {
    team: CompetitionTeam;
    groupName: string;
    groupPosition: number;
    overallPosition?: number;

    PJ: number;
    PG: number;
    PP: number;
    WO: number;

    SF: number;
    SC: number;
    CS: number;

    TF: number;
    TC: number;
    CT: number;

    PTS: number;

    qualificationReason:
    | 'TOP_PER_GROUP'
    | 'BEST_THIRD'
    | 'BEST_REMAINING'
    | 'BEST_OVERALL';
};

export type QualificationResult = {
    qualifiedTeams: QualifiedTeam[];
    totalQualified: number;
};

/**  ========================QualificationEND =======================*/

export type BracketRoundName =
    | 'round_of_32'
    | 'round_of_16'
    | 'quarterfinal'
    | 'semifinal'
    | 'third_place'
    | 'final';

export type BracketSeedingStrategy =
    | 'standard'
    | 'snake';

export type BracketOptions = {
    /**
     * Estrategia de cruces:
     * standard:
     * 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
     */
    seedingStrategy?: BracketSeedingStrategy;

    /**
     * Si es true, crea también partido de tercer puesto.
     */
    includeThirdPlaceMatch?: boolean;

    /**
     * Número inicial para los partidos.
     */
    initialMatchNumber?: number;
};

export type BracketTeam = {
    team: CompetitionTeam;
    seed: number;
    groupName?: string;
    groupPosition?: number;
};

export type BracketMatch = {
    matchNumber: number;
    roundName: BracketRoundName;
    roundLabel: string;
    bracketPosition: number;

    teamA?: BracketTeam;
    teamB?: BracketTeam;

    teamASeed?: number;
    teamBSeed?: number;

    winnerToMatchNumber?: number;
    loserToMatchNumber?: number;

    status: MatchStatus;
};

export type BracketRound = {
    roundName: BracketRoundName;
    roundLabel: string;
    matches: BracketMatch[];
};

export type BracketResult = {
    rounds: BracketRound[];
    totalMatches: number;
};