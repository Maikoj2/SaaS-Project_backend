// export class PhaseService {
//     async createPhase(data: CreatePhaseDTO) {
//         const phase = new Phase(data);
//         return await phase.save();
//     }

//     async qualifyTeams(phaseId: string, teams: any[]) {
//         return await Phase.updateQualifiedTeams(phaseId, teams);
//     }

//     async advanceToNextPhase(phaseId: string) {
//         const currentPhase = await Phase.findById(phaseId);
//         if (!currentPhase || !currentPhase.nextPhaseId) {
//             throw new Error('No next phase defined');
//         }

//         const nextPhase = await Phase.findById(currentPhase.nextPhaseId);
//         if (!nextPhase) {
//             throw new Error('Next phase not found');
//         }

//         // Transferir equipos clasificados
//         nextPhase.qualifiedTeams = currentPhase.qualifiedTeams.map(team => ({
//             ...team,
//             fromPhase: currentPhase._id
//         }));

//         await nextPhase.save();
//         return nextPhase;
//     }

//     async getPhaseStandings(phaseId: string) {
//         const phase = await Phase.findById(phaseId)
//             .populate('qualifiedTeams.teamId');

//         if (!phase) throw new Error('Phase not found');

//         return phase.qualifiedTeams.sort((a, b) => {
//             if (a.globalRanking && b.globalRanking) {
//                 return a.globalRanking - b.globalRanking;
//             }
//             return b.points - a.points;
//         });
//     }
// } 