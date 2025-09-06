
import { Phase } from '../../models/championship/phase.model';
import { Championship } from '../../models/championship/championship.model';
import { Group } from '../../models/championship/group.model';
import { Match } from '../../models/championship/match.model';
import { Team } from '../../models/championship/team.model';

export class PhaseService {
  public async createPhase(phaseData: any): Promise<Phase> {
    try {
      // Validate championship exists
      const championship = await Championship.findByPk(phaseData.championship_id);
      if (!championship) {
        throw new Error('Championship not found');
      }

      // Validate phase order uniqueness within championship
      const existingPhase = await Phase.findOne({
        where: {
          championship_id: phaseData.championship_id,
          phase_order: phaseData.phase_order
        }
      });

      if (existingPhase) {
        throw new Error('Phase order already exists in this championship');
      }

      const phase = await Phase.create(phaseData);
      return phase;
    } catch (error: any) {
      throw new Error(`Error creating phase: ${error.message}`);
    }
  }

  public async getAllPhases(championshipId?: string): Promise<Phase[]> {
    try {
      const whereClause: any = {};
      if (championshipId) {
        whereClause.championship_id = championshipId;
      }

      const phases = await Phase.findAll({
        where: whereClause,
        include: [
          {
            model: Championship,
            as: 'championship',
            attributes: ['id', 'name']
          },
          {
            model: Group,
            as: 'groups',
            attributes: ['id', 'name']
          }
        ],
        order: [['phase_order', 'ASC']]
      });

      return phases;
    } catch (error: any) {
      throw new Error(`Error retrieving phases: ${error.message}`);
    }
  }

  public async getPhaseById(id: number): Promise<Phase | null> {
    try {
      const phase = await Phase.findByPk(id, {
        include: [
          {
            model: Championship,
            as: 'championship',
            attributes: ['id', 'name']
          },
          {
            model: Group,
            as: 'groups',
            attributes: ['id', 'name']
          },
          {
            model: Match,
            as: 'matches',
            attributes: ['id', 'scheduled_date', 'status'],
            include: [
              {
                model: Team,
                as: 'team1',
                attributes: ['id', 'name']
              },
              {
                model: Team,
                as: 'team2',
                attributes: ['id', 'name']
              }
            ]
          }
        ]
      });

      return phase;
    } catch (error: any) {
      throw new Error(`Error retrieving phase: ${error.message}`);
    }
  }

  public async updatePhase(id: number, updateData: any): Promise<Phase | null> {
    try {
      const phase = await Phase.findByPk(id);
      if (!phase) {
        return null;
      }

      // Prevent updating finished phases
      if (phase.status === 'finished') {
        throw new Error('Cannot modify a finished phase');
      }

      // If updating phase order, check uniqueness
      if (updateData.phase_order && updateData.phase_order !== phase.phase_order) {
        const existingPhase = await Phase.findOne({
          where: {
            championship_id: phase.championship_id,
            phase_order: updateData.phase_order,
            id: { [Op.ne]: id }
          }
        });

        if (existingPhase) {
          throw new Error('Phase order already exists in this championship');
        }
      }

      await phase.update(updateData);
      return phase;
    } catch (error: any) {
      throw new Error(`Error updating phase: ${error.message}`);
    }
  }

  public async deletePhase(id: number): Promise<boolean> {
    try {
      const phase = await Phase.findByPk(id);
      if (!phase) {
        return false;
      }

      // Prevent deleting phases that have started or finished
      if (phase.status === 'in_progress' || phase.status === 'finished') {
        throw new Error('Cannot delete a phase that has started or finished');
      }

      // Check if phase has groups
      const groupsCount = await Group.count({ where: { phase_id: id } });
      if (groupsCount > 0) {
        throw new Error('Cannot delete phase with existing groups');
      }

      // Check if phase has matches
      const matchesCount = await Match.count({ where: { phase_id: id } });
      if (matchesCount > 0) {
        throw new Error('Cannot delete phase with existing matches');
      }

      await phase.destroy();
      return true;
    } catch (error: any) {
      throw new Error(`Error deleting phase: ${error.message}`);
    }
  }

  public async startPhase(id: number): Promise<Phase> {
    try {
      const phase = await Phase.findByPk(id);
      if (!phase) {
        throw new Error('Phase not found');
      }

      if (phase.status !== 'scheduled') {
        throw new Error('Only scheduled phases can be started');
      }

      await phase.update({
        status: 'in_progress',
        start_date: new Date()
      });

      return phase;
    } catch (error: any) {
      throw new Error(`Error starting phase: ${error.message}`);
    }
  }

  public async finishPhase(id: number): Promise<Phase> {
    try {
      const phase = await Phase.findByPk(id);
      if (!phase) {
        throw new Error('Phase not found');
      }

      if (phase.status !== 'in_progress') {
        throw new Error('Only phases in progress can be finished');
      }

      // Check if all matches in this phase are finished
      const unfinishedMatches = await Match.count({
        where: {
          phase_id: id,
          status: { [Op.ne]: 'finished' }
        }
      });

      if (unfinishedMatches > 0) {
        throw new Error('Cannot finish phase with unfinished matches');
      }

      await phase.update({
        status: 'finished',
        end_date: new Date()
      });

      return phase;
    } catch (error: any) {
      throw new Error(`Error finishing phase: ${error.message}`);
    }
  }

  public async getPhaseGroups(phaseId: number): Promise<Group[]> {
    try {
      const groups = await Group.findAll({
        where: { phase_id: phaseId },
        include: [
          {
            model: Team,
            as: 'teams',
            attributes: ['id', 'name']
          }
        ],
        order: [['name', 'ASC']]
      });

      return groups;
    } catch (error: any) {
      throw new Error(`Error retrieving phase groups: ${error.message}`);
    }
  }

  public async getPhaseMatches(phaseId: number): Promise<Match[]> {
    try {
      const matches = await Match.findAll({
        where: { phase_id: phaseId },
        include: [
          {
            model: Team,
            as: 'team1',
            attributes: ['id', 'name']
          },
          {
            model: Team,
            as: 'team2',
            attributes: ['id', 'name']
          },
          {
            model: Group,
            as: 'group',
            attributes: ['id', 'name']
          }
        ],
        order: [['scheduled_date', 'ASC']]
      });

      return matches;
    } catch (error: any) {
      throw new Error(`Error retrieving phase matches: ${error.message}`);
    }
  }
}
