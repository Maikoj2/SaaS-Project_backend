import { Types } from 'mongoose';

import { CustomError } from '../../errors';
import { DatabaseHelper } from '../../utils/database.helper';

import EliminationBracket from '../../models/mongoose/championship/eliminationBracket';
import { Match } from '../../models/mongoose/championship/match';

import {
    advanceBracketMatchWinner,
} from '../../domain/championship/competition';

type AdvanceEliminationInput = {
    matchId: string;
    winnerTeamId: string;
};

export class EliminationProgressionService {
    async advanceAfterMatchResult(
        tenant: string,
        data: AdvanceEliminationInput
    ) {
        const match: any = await DatabaseHelper.findOne(
            Match,
            tenant,
            {
                _id: new Types.ObjectId(data.matchId),
            },
            {
                throwError: true,
                errorMessage: 'Match not found',
            }
        );

        if (!match.isEliminationMatch) {
            return {
                advanced: false,
                reason: 'Match is not an elimination match',
            };
        }

        if (!match.eliminationBracketId) {
            throw new CustomError(
                'Elimination match does not have eliminationBracketId',
                400,
                'EliminationProgressionServiceError'
            );
        }

        if (!match.bracketMatchNumber) {
            throw new CustomError(
                'Elimination match does not have bracketMatchNumber',
                400,
                'EliminationProgressionServiceError'
            );
        }

        const eliminationBracket: any = await DatabaseHelper.findOne(
            EliminationBracket,
            tenant,
            {
                _id: match.eliminationBracketId,
            },
            {
                throwError: true,
                errorMessage: 'Elimination bracket not found',
            }
        );

        const updatedBracket = advanceBracketMatchWinner(
            eliminationBracket.bracket,
            match.bracketMatchNumber,
            data.winnerTeamId
        );

        const createdNextMatches = await this.createReadyBracketMatches(
            tenant,
            match,
            eliminationBracket,
            updatedBracket
        );
        const isCompleted = this.isBracketCompleted(updatedBracket);

        const updatedEliminationBracket = await DatabaseHelper.findOneAndUpdate(
            EliminationBracket,
            tenant,
            {
                _id: eliminationBracket._id,
            },
            {
                $set: {
                    bracket: updatedBracket,
                    status: isCompleted ? 'completed' : eliminationBracket.status,
                },
                $push: {
                    matches: {
                        $each: createdNextMatches,
                    },
                },
            },
            {
                new: true,
            }
        );
        if (!updatedEliminationBracket) {
            throw new CustomError(
                'Error updating elimination bracket',
                500,
                'EliminationProgressionServiceError'
            );
        }

        return {
            advanced: true,
            eliminationBracketId: updatedEliminationBracket._id,
            bracket: updatedEliminationBracket.bracket,
            createdMatches: createdNextMatches,
        };
    }

    private async createReadyBracketMatches(
        tenant: string,
        sourceMatch: any,
        eliminationBracket: any,
        bracket: any
    ) {
        const createdMatches = [];

        const allBracketMatches = this.getAllBracketMatches(bracket);

        for (const bracketMatch of allBracketMatches) {
            if (!this.isBracketMatchReady(bracketMatch)) {
                continue;
            }

            if (await this.realMatchAlreadyExists(tenant, eliminationBracket._id, bracketMatch.matchNumber)) {
                continue;
            }

            const createdMatch = await DatabaseHelper.create(
                Match,
                tenant,
                {
                    championshipId: sourceMatch.championshipId,

                    homeTeamId: new Types.ObjectId(bracketMatch.teamA.team.id),
                    awayTeamId: new Types.ObjectId(bracketMatch.teamB.team.id),

                    gameFormatId: sourceMatch.gameFormatId,

                    status: 'scheduled',

                    isEliminationMatch: true,
                    eliminationBracketId: eliminationBracket._id,

                    bracketMatchNumber: bracketMatch.matchNumber,
                    bracketRoundName: bracketMatch.roundName,
                    bracketRoundLabel: bracketMatch.roundLabel,
                    bracketPosition: bracketMatch.bracketPosition,
                }
            );

            createdMatches.push({
                matchNumber: bracketMatch.matchNumber,
                matchId: createdMatch._id,
                roundName: bracketMatch.roundName,
                roundLabel: bracketMatch.roundLabel,
                bracketPosition: bracketMatch.bracketPosition,
            });
        }

        return createdMatches;
    }

    private getAllBracketMatches(bracket: any): any[] {
        return (bracket.rounds || []).flatMap((round: any) => round.matches || []);
    }

    private isBracketMatchReady(bracketMatch: any): boolean {
        return Boolean(
            bracketMatch.teamA?.team?.id &&
            bracketMatch.teamB?.team?.id &&
            bracketMatch.status === 'scheduled'
        );
    }

    private async realMatchAlreadyExists(
        tenant: string,
        eliminationBracketId: Types.ObjectId,
        bracketMatchNumber: number
    ): Promise<boolean> {
        const existingMatch = await DatabaseHelper.findOne(
            Match,
            tenant,
            {
                eliminationBracketId,
                bracketMatchNumber,
                isEliminationMatch: true,
            },
            {
                throwError: false,
                errorMessage: 'Elimination match not found',
            }
        );

        return Boolean(existingMatch);
    }
    private isBracketCompleted(bracket: any): boolean {
        const finalRound = (bracket.rounds || []).find(
            (round: any) => round.roundName === 'final'
        );

        const finalMatch = finalRound?.matches?.[0];

        return finalMatch?.status === 'finished' || finalMatch?.status === 'walkover';
    }
}