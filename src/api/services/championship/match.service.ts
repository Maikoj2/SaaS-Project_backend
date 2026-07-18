import { Types } from "mongoose";
import { CustomError } from "../../errors";
import { DatabaseHelper } from "../../utils/database.helper";

import Match from "../../models/mongoose/championship/match";
import Group from "../../models/mongoose/championship/group";
import ChampionshipConfiguration from "../../models/mongoose/championship/configuration";
import { EliminationProgressionService } from "./eliminationProgression.service";
import {
    CompetitionMatch,
    MatchStatus,
    SetResult,
    VolleyballMatchRules,
    applyMatchResult,
    calculateStandingsFromMatches,
} from "../../domain/championship/competition";
import { PaginationOptions } from "../../interfaces";
import { PopulateOptions } from "../../interfaces/IhelperDatabase";

type RegisterMatchResultInput = {
    sets?: Array<{
        homeTeam: number;
        awayTeam: number;
    }>;
    walkoverWinnerId?: string;
};

export class MatchService {

    private eliminationProgressionService = new EliminationProgressionService();


    async registerMatchResult(
        tenant: string,
        matchId: string,
        data: RegisterMatchResultInput
    ) {
        const match = await DatabaseHelper.findById(
            Match,
            matchId,
            tenant
        );

        if (!match) {
            throw new CustomError(
                "Match not found",
                404,
                "MatchServiceError"
            );
        }

        if (match.status === "finished" || match.status === "walkover") {
            throw new CustomError(
                "Match already completed",
                400,
                "MatchServiceError"
            );
        }

        if (!match.groupId && !match.isEliminationMatch) {
            throw new CustomError(
                "Match does not belong to a group or elimination bracket",
                400,
                "MatchServiceError"
            );
        }

        if (!data.walkoverWinnerId && (!data.sets || data.sets.length === 0)) {
            throw new CustomError(
                "Sets or walkoverWinnerId are required",
                400,
                "MatchServiceError"
            );
        }

        const configuration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            {
                championshipId: match.championshipId,
            },
            {
                throwError: true,
                errorMessage: "Championship configuration not found",
            }
        );

        if (!configuration) {
            throw new CustomError(
                "Championship configuration not found",
                404,
                "MatchServiceError"
            );
        }

        const rules = configuration.matchRules as VolleyballMatchRules;
        const pointsPolicy = configuration.tablePointsPolicy;

        const competitionMatch = this.mapMongoMatchToDomainMatch(match);

        const inputSets = data.sets
            ? this.mapSetsToDomain(data.sets)
            : [];

        let completedCompetitionMatch: CompetitionMatch;

        try {
            completedCompetitionMatch = applyMatchResult(
                competitionMatch,
                inputSets,
                rules,
                data.walkoverWinnerId
            );
        } catch (error) {
            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : "Invalid match result",
                400,
                "MatchServiceError"
            );
        }

        const finalSets = completedCompetitionMatch.sets || [];

        const updatedMatch = await DatabaseHelper.findOneAndUpdate(
            Match,
            tenant,
            {
                _id: new Types.ObjectId(matchId),
            },
            {
                $set: {
                    score: {
                        homeTeam: this.countTeamASetsWon(finalSets),
                        awayTeam: this.countTeamBSetsWon(finalSets),
                        periods: finalSets.map((set) => ({
                            number: set.setNumber,
                            homeTeam: set.teamAScore,
                            awayTeam: set.teamBScore,
                        })),
                    },
                    winnerId: completedCompetitionMatch.winnerId
                        ? new Types.ObjectId(completedCompetitionMatch.winnerId)
                        : undefined,
                    status: completedCompetitionMatch.status,
                    endTime: new Date(),
                },
            },
            {
                new: true,
            }
        );

        if (!updatedMatch || !updatedMatch.winnerId) {
            throw new CustomError(
                "Error updating match result",
                500,
                "MatchServiceError"
            );
        }

        if (updatedMatch.isEliminationMatch) {
            const progression =
                await this.eliminationProgressionService.advanceAfterMatchResult(
                    tenant,
                    {
                        matchId: updatedMatch._id.toString(),
                        winnerTeamId: updatedMatch.winnerId.toString(),
                    }
                );

            return {
                match: updatedMatch,
                progression,
            };
        }
        if (!match.groupId) {
            throw new CustomError(
                "Match does not belong to a group",
                400,
                "MatchServiceError"
            );
        }

        if (!['finished', 'walkover'].includes(updatedMatch.status)) {
            throw new CustomError(
                "Match is not completed yet",
                400,
                "MatchServiceError"
            );
        }

        const updatedGroup = await this.recalculateGroupStandings(
            tenant,
            match.groupId.toString(),
            rules,
            pointsPolicy
        );

        return {
            match: updatedMatch,
            winnerId: completedCompetitionMatch.winnerId,
            result: {
                winnerId: completedCompetitionMatch.winnerId,
                status: completedCompetitionMatch.status,
                sets: finalSets,
                score: {
                    homeTeam: this.countTeamASetsWon(finalSets),
                    awayTeam: this.countTeamBSetsWon(finalSets),
                },
            },
            group: updatedGroup,
        };
    }

    async getMatchesByChampionship(
        tenant: string,
        championshipId: string,
        filters: {
            status?: string;
            isEliminationMatch?: string;
            groupId?: string;
            eliminationBracketId?: string;
        },
        options?: PaginationOptions
    ) {
        const query: Record<string, any> = {
            championshipId: new Types.ObjectId(championshipId),
        };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.isEliminationMatch !== undefined) {
            query.isEliminationMatch = filters.isEliminationMatch === 'true';
        }

        if (filters.groupId) {
            query.groupId = new Types.ObjectId(filters.groupId);
        }

        if (filters.eliminationBracketId) {
            query.eliminationBracketId = new Types.ObjectId(
                filters.eliminationBracketId
            );
        }

        const optionsPopulate = this.populateOptions;

        const matches = await DatabaseHelper.getItemsWithRelations(
            Match,
            tenant,
            query,
            options,
            {
                nested: optionsPopulate,
            }
        );
        return matches;
    }

    async getMatchById(
        tenant: string,
        championshipId: string,
        matchId: string
    ) {

        const optionsPopulate = this.populateOptions;

        const match = await DatabaseHelper.findOneWithRelations(
            Match,
            tenant,
            {
                _id: new Types.ObjectId(matchId),
                championshipId: new Types.ObjectId(championshipId),
            },
            {
                nested: optionsPopulate,
            }
        );

        if (!match) {
            throw new CustomError(
                'Match not found',
                404,
                'MatchServiceError'
            );
        }

        return match;
    }

    async getMatchesByGroup(
        tenant: string,
        championshipId: string,
        groupId: string,
        filters: {
            status?: string;
        }
    ) {
        return this.getMatchesByChampionship(tenant, championshipId, {
            ...filters,
            groupId,
            isEliminationMatch: 'false',
        });
    }

    async getMatchesByEliminationBracket(
        tenant: string,
        championshipId: string,
        eliminationBracketId: string,
        filters: {
            status?: string;
        }
    ) {
        return this.getMatchesByChampionship(tenant, championshipId, {
            ...filters,
            eliminationBracketId,
            isEliminationMatch: 'true',
        });
    }

    private get populateOptions(): PopulateOptions[] {
        return [
            {
                path: 'homeTeamId',
                select: 'name clubName teamName',
            },
            {
                path: 'awayTeamId',
                select: 'name clubName teamName',
            },
            {
                path: 'groupId',
                select: 'name status',
            },
            {
                path: 'courtId',
                select: 'name type status location',
            },
            {
                path: 'gameFormatId',
                select: 'name formatType sets pointsPerSet',
            },
            {
                path: 'eliminationBracketId',
                select: 'name status groupDistributionId',
            },
        ];
    }

    private async recalculateGroupStandings(
        tenant: string,
        groupId: string,
        rules: VolleyballMatchRules,
        pointsPolicy: any
    ) {
        const completedMatches = await DatabaseHelper.getItemsWithRelations(
            Match,
            tenant,
            {
                groupId: new Types.ObjectId(groupId),
                status: {
                    $in: ["finished", "walkover"],
                },
            },
            {
                limit: 100,
                sort: {
                    startTime: 1,
                    createdAt: 1,
                },
                select: [
                    "_id",
                    "groupId",
                    "homeTeamId",
                    "awayTeamId",
                    "score",
                    "winnerId",
                    "status",
                ],
            },
            {
                basic: ["homeTeamId", "awayTeamId"],
            }
        );

        const competitionMatches = completedMatches.docs.map(
            (completedMatch: any) =>
                this.mapMongoCompletedMatchToCompetitionMatch(completedMatch)
        );

        const standings = calculateStandingsFromMatches(
            competitionMatches,
            {
                rules,
                pointsPolicy,
            }
        );

        const rankings = standings.map((standing) => ({
            teamId: new Types.ObjectId(standing.team.id),
            position: standing.POS || 0,

            points: standing.PTS,
            matchesPlayed: standing.PJ,
            won: standing.PG,
            lost: standing.PP,
            walkovers: standing.WO,

            setsFor: standing.SF,
            setsAgainst: standing.SC,
            setRatio: standing.CS,

            pointsFor: standing.TF,
            pointsAgainst: standing.TC,
            pointRatio: standing.CT,
        }));

        const updatedGroup = await DatabaseHelper.findOneAndUpdate(
            Group,
            tenant,
            {
                _id: new Types.ObjectId(groupId),
            },
            {
                $set: {
                    rankings,
                },
            },
            {
                new: true,
            }
        );

        if (!updatedGroup) {
            throw new CustomError(
                "Error updating group standings",
                500,
                "MatchServiceError"
            );
        }

        return updatedGroup;
    }

    private mapSetsToDomain(
        sets: NonNullable<RegisterMatchResultInput["sets"]>
    ): SetResult[] {
        return sets.map((set, index) => ({
            setNumber: index + 1,
            teamAScore: set.homeTeam,
            teamBScore: set.awayTeam,
        }));
    }

    private mapMongoMatchToDomainMatch(match: any): CompetitionMatch {
        return {
            id: match._id.toString(),
            matchNumber: 0,
            groupName: match.groupId?.toString(),
            teamA: {
                id: match.homeTeamId.toString(),
                name: "",
            },
            teamB: {
                id: match.awayTeamId.toString(),
                name: "",
            },
            status: match.status as MatchStatus,
        };
    }

    private mapMongoCompletedMatchToCompetitionMatch(match: any): CompetitionMatch {
        return {
            id: match._id.toString(),
            matchNumber: 0,
            groupName: match.groupId?.toString(),

            teamA: {
                id: this.getTeamId(match.homeTeamId),
                name: this.getTeamName(match.homeTeamId),
            },

            teamB: {
                id: this.getTeamId(match.awayTeamId),
                name: this.getTeamName(match.awayTeamId),
            },

            sets: (match.score?.periods || []).map((period: any) => ({
                setNumber: period.number,
                teamAScore: period.homeTeam,
                teamBScore: period.awayTeam,
            })),

            winnerId: match.winnerId?.toString(),
            status: match.status as MatchStatus,
        };
    }

    private countTeamASetsWon(sets: SetResult[]): number {
        return sets.filter((set) => set.teamAScore > set.teamBScore).length;
    }

    private countTeamBSetsWon(sets: SetResult[]): number {
        return sets.filter((set) => set.teamBScore > set.teamAScore).length;
    }

    private getTeamId(team: any): string {
        if (!team) {
            return "";
        }

        if (team._id) {
            return team._id.toString();
        }

        return team.toString();
    }

    private getTeamName(team: any): string {
        if (!team) {
            return "";
        }

        return team.name || "";
    }
}