import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TeamMemberConfig, SkillProficiency } from './team-member-config.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TeamMemberConfigService {
  constructor(
    @InjectRepository(TeamMemberConfig)
    private readonly repo: Repository<TeamMemberConfig>,
    private readonly audit: AuditService,
  ) {}

  private getCurrentMonthStartUtc(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  private addMonthsUtc(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  }

  private toYearMonthKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private roundDays(hours: number): number {
    return Math.round((hours / 8) * 10) / 10;
  }

  // ==================== LIST ====================
  async list(tenantId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;

    // Get all team member configs with user info and team info
    const items = await mg.query(`
      SELECT
        tmc.*,
        TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as user_display_name,
        u.email as user_email,
        pt.name as team_name
      FROM portfolio_team_member_configs tmc
      LEFT JOIN users u ON u.id = tmc.user_id
      LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id
      WHERE tmc.tenant_id = $1
      ORDER BY u.first_name ASC, u.last_name ASC, u.email ASC
    `, [tenantId]);

    return { items };
  }

  // ==================== GET BY ID ====================
  async get(id: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;

    const rows = await mg.query(`
      SELECT
        tmc.*,
        TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) as user_display_name,
        u.email as user_email,
        pt.name as team_name
      FROM portfolio_team_member_configs tmc
      LEFT JOIN users u ON u.id = tmc.user_id
      LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id
      WHERE tmc.id = $1
    `, [id]);

    if (rows.length === 0) {
      throw new NotFoundException('Team member config not found');
    }

    return rows[0];
  }

  // ==================== GET BY USER ID ====================
  async getByUserId(userId: string, tenantId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    return repo.findOne({
      where: { user_id: userId, tenant_id: tenantId },
    });
  }

  // ==================== CREATE ====================
  async create(
    body: {
      user_id: string;
      areas_of_expertise?: string[];
      skills?: SkillProficiency[];
      project_availability?: number;
      notes?: string;
      team_id?: string;
    },
    tenantId: string,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    const entity = repo.create({
      tenant_id: tenantId,
      user_id: body.user_id,
      areas_of_expertise: body.areas_of_expertise || [],
      skills: body.skills || [],
      project_availability: body.project_availability ?? 5,
      notes: body.notes || null,
      team_id: body.team_id || undefined,
    });

    const saved = await repo.save(entity);

    await this.audit.log({
      table: 'portfolio_team_member_configs',
      recordId: saved.id,
      action: 'create',
      before: null,
      after: saved,
      userId,
    }, { manager: mg });

    return saved;
  }

  // ==================== UPDATE ====================
  async update(
    id: string,
    body: {
      areas_of_expertise?: string[];
      skills?: SkillProficiency[];
      project_availability?: number;
      notes?: string;
      team_id?: string | null;
    },
    userId: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    const existing = await repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Team member config not found');

    const before = { ...existing };

    if (body.areas_of_expertise !== undefined) {
      existing.areas_of_expertise = body.areas_of_expertise;
    }
    if (body.skills !== undefined) {
      existing.skills = body.skills;
    }
    if (body.project_availability !== undefined) {
      existing.project_availability = body.project_availability;
    }
    if (body.notes !== undefined) {
      existing.notes = body.notes || undefined;
    }
    if (body.team_id !== undefined) {
      existing.team_id = body.team_id || undefined;
    }

    existing.updated_at = new Date();

    const saved = await repo.save(existing);

    await this.audit.log({
      table: 'portfolio_team_member_configs',
      recordId: id,
      action: 'update',
      before,
      after: saved,
      userId,
    }, { manager: mg });

    return saved;
  }

  // ==================== DELETE ====================
  async delete(
    id: string,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    const existing = await repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Team member config not found');

    await repo.delete({ id });

    await this.audit.log({
      table: 'portfolio_team_member_configs',
      recordId: id,
      action: 'delete',
      before: existing,
      after: null,
      userId,
    }, { manager: mg });

    return { ok: true };
  }

  // ==================== TIME STATS ====================
  async getTimeStats(id: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    const config = await repo.findOne({ where: { id } });
    if (!config) throw new NotFoundException('Team member config not found');

    const userId = config.user_id;
    const currentMonth = this.getCurrentMonthStartUtc();
    const start12 = this.addMonthsUtc(currentMonth, -11);
    const start6 = this.addMonthsUtc(currentMonth, -5);

    const rows = await mg.query(
      `SELECT year_month, project_hours, other_hours, total_hours
       FROM user_time_monthly_aggregates
       WHERE tenant_id = app_current_tenant()
         AND user_id = $1
         AND year_month >= $2::date
         AND year_month <= $3::date
       ORDER BY year_month ASC`,
      [userId, start12, currentMonth],
    );

    const byMonth = new Map<string, { project: number; other: number; total: number }>();
    for (const row of rows) {
      const key = this.toYearMonthKey(new Date(row.year_month as string));
      const project = Number(row.project_hours) || 0;
      const other = Number(row.other_hours) || 0;
      const total = Number(row.total_hours) || 0;
      byMonth.set(key, { project, other, total });
    }

    const monthly: Array<{ yearMonth: string; projectDays: number; otherDays: number; totalDays: number }> = [];
    for (let i = 0; i < 12; i += 1) {
      const month = this.addMonthsUtc(start12, i);
      const key = this.toYearMonthKey(month);
      const row = byMonth.get(key);
      monthly.push({
        yearMonth: key,
        projectDays: this.roundDays(row?.project ?? 0),
        otherDays: this.roundDays(row?.other ?? 0),
        totalDays: this.roundDays(row?.total ?? 0),
      });
    }

    const avgRows = await mg.query(
      `SELECT AVG(project_hours)::numeric AS avg_project_hours
       FROM user_time_monthly_aggregates
       WHERE tenant_id = app_current_tenant()
         AND user_id = $1
         AND year_month >= $2::date
         AND year_month <= $3::date`,
      [userId, start6, currentMonth],
    );

    const avgProjectHours = Number(avgRows?.[0]?.avg_project_hours) || 0;

    return {
      userId,
      averageProjectDays: this.roundDays(avgProjectHours),
      monthly,
    };
  }

  async getAllTimeStats(tenantId: string, opts?: { manager?: EntityManager }) {
    const mg = opts?.manager ?? this.repo.manager;
    const currentMonth = this.getCurrentMonthStartUtc();
    const start6 = this.addMonthsUtc(currentMonth, -5);

    const rows = await mg.query(
      `SELECT tmc.id AS config_id,
              AVG(utma.project_hours)::numeric AS avg_project_hours,
              AVG(utma.total_hours)::numeric AS avg_total_hours
       FROM portfolio_team_member_configs tmc
       LEFT JOIN user_time_monthly_aggregates utma
         ON utma.tenant_id = tmc.tenant_id
        AND utma.user_id = tmc.user_id
        AND utma.year_month >= $1::date
        AND utma.year_month <= $2::date
       WHERE tmc.tenant_id = $3
       GROUP BY tmc.id`,
      [start6, currentMonth, tenantId],
    );

    const stats: Record<string, { avgProjectDays: number; avgTotalDays: number }> = {};
    for (const row of rows) {
      if (row.avg_project_hours == null && row.avg_total_hours == null) continue;
      stats[row.config_id] = {
        avgProjectDays: this.roundDays(Number(row.avg_project_hours) || 0),
        avgTotalDays: this.roundDays(Number(row.avg_total_hours) || 0),
      };
    }

    return { stats };
  }

  // ==================== CREATE OR UPDATE BY USER ====================
  async upsertByUser(
    targetUserId: string,
    body: {
      areas_of_expertise?: string[];
      skills?: SkillProficiency[];
      project_availability?: number;
      notes?: string;
      team_id?: string | null;
    },
    tenantId: string,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(TeamMemberConfig);

    let existing = await repo.findOne({
      where: { user_id: targetUserId, tenant_id: tenantId },
    });

    if (existing) {
      return this.update(existing.id, body, userId, opts);
    } else {
      return this.create(
        { user_id: targetUserId, ...body },
        tenantId,
        userId,
        opts,
      );
    }
  }
}
