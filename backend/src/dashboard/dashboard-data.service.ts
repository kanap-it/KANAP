import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

interface ServiceOptions {
  manager?: EntityManager;
}

export interface MyLeadershipProject {
  id: string;
  name: string;
  status: string;
  role: 'it_lead' | 'business_lead' | 'it_sponsor' | 'business_sponsor';
  planned_end: string | null;
  next_milestone: {
    id: string;
    name: string;
    target_date: string | null;
  } | null;
}

export interface MyContributionProject {
  id: string;
  name: string;
  status: string;
  team: 'it_team' | 'business_team';
  my_tasks_count: number;
}

export interface TimeSummary {
  totalHours: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    hours: number;
  }>;
  byCategory: {
    it: number;
    business: number;
  };
  nonProjectTaskHours: number;
}

@Injectable()
export class DashboardDataService {
  /**
   * Get projects where the user is a lead or sponsor
   */
  async getMyLeadershipProjects(
    userId: string,
    limit: number = 5,
    opts?: ServiceOptions,
  ): Promise<MyLeadershipProject[]> {
    const manager = opts?.manager;
    if (!manager) throw new Error('EntityManager required');

    // Query projects where user is in a leadership role
    const projects = await manager.query(
      `
      WITH leadership_projects AS (
        SELECT
          p.id,
          p.name,
          p.status,
          p.planned_end,
          CASE
            WHEN p.it_lead_id = $1 THEN 'it_lead'
            WHEN p.business_lead_id = $1 THEN 'business_lead'
            WHEN p.it_sponsor_id = $1 THEN 'it_sponsor'
            WHEN p.business_sponsor_id = $1 THEN 'business_sponsor'
          END as role
        FROM portfolio_projects p
        WHERE (
          p.it_lead_id = $1
          OR p.business_lead_id = $1
          OR p.it_sponsor_id = $1
          OR p.business_sponsor_id = $1
        )
        AND p.status NOT IN ('done', 'cancelled')
        ORDER BY p.name ASC
        LIMIT $2
      )
      SELECT
        lp.*,
        m.id as milestone_id,
        m.name as milestone_name,
        m.target_date as milestone_target_date
      FROM leadership_projects lp
      LEFT JOIN LATERAL (
        SELECT id, name, target_date
        FROM portfolio_project_milestones
        WHERE project_id = lp.id
          AND status NOT IN ('completed', 'cancelled')
        ORDER BY target_date ASC NULLS LAST
        LIMIT 1
      ) m ON true
      `,
      [userId, limit],
    );

    return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      role: p.role,
      planned_end: p.planned_end,
      next_milestone: p.milestone_id
        ? {
            id: p.milestone_id,
            name: p.milestone_name,
            target_date: p.milestone_target_date,
          }
        : null,
    }));
  }

  /**
   * Get projects where the user is a team member but NOT a lead/sponsor
   */
  async getMyContributionProjects(
    userId: string,
    limit: number = 5,
    opts?: ServiceOptions,
  ): Promise<MyContributionProject[]> {
    const manager = opts?.manager;
    if (!manager) throw new Error('EntityManager required');

    const projects = await manager.query(
      `
      SELECT
        p.id,
        p.name,
        p.status,
        ppt.role as team,
        COALESCE(task_counts.count, 0)::int as my_tasks_count
      FROM portfolio_projects p
      JOIN portfolio_project_team ppt
        ON ppt.project_id = p.id
        AND ppt.user_id = $1
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as count
        FROM tasks t
        WHERE t.related_object_type = 'project'
          AND t.related_object_id = p.id
          AND t.assignee_user_id = $1
          AND t.status NOT IN ('done', 'cancelled')
      ) task_counts ON true
      WHERE p.status NOT IN ('done', 'cancelled')
        AND p.it_lead_id IS DISTINCT FROM $1
        AND p.business_lead_id IS DISTINCT FROM $1
        AND p.it_sponsor_id IS DISTINCT FROM $1
        AND p.business_sponsor_id IS DISTINCT FROM $1
      ORDER BY p.name ASC
      LIMIT $2
      `,
      [userId, limit],
    );

    return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      team: p.team,
      my_tasks_count: p.my_tasks_count,
    }));
  }

  /**
   * Get time summary for the user over the specified number of days
   */
  async getTimeSummary(
    userId: string,
    days: number = 7,
    opts?: ServiceOptions,
  ): Promise<TimeSummary> {
    const manager = opts?.manager;
    if (!manager) throw new Error('EntityManager required');

    // Query time entries from both task_time_entries and portfolio_project_time_entries
    const result = await manager.query(
      `
      WITH date_cutoff AS (
        SELECT (NOW() - ($2 || ' days')::interval)::timestamptz as cutoff
      ),
      -- Task time entries with project association
      task_time AS (
        SELECT
          tte.hours::numeric as hours,
          tte.category,
          t.related_object_id as project_id,
          t.related_object_type
        FROM task_time_entries tte
        JOIN tasks t ON t.id = tte.task_id
        CROSS JOIN date_cutoff dc
        WHERE tte.user_id = $1
          AND tte.logged_at >= dc.cutoff
      ),
      -- Direct project time entries
      project_time AS (
        SELECT
          pte.hours::numeric as hours,
          pte.category,
          pte.project_id,
          'project' as related_object_type
        FROM portfolio_project_time_entries pte
        CROSS JOIN date_cutoff dc
        WHERE pte.user_id = $1
          AND pte.logged_at >= dc.cutoff
      ),
      -- Combined time entries
      all_time AS (
        SELECT * FROM task_time
        UNION ALL
        SELECT * FROM project_time
      ),
      -- Sum by project
      by_project AS (
        SELECT
          at.project_id,
          p.name as project_name,
          SUM(at.hours) as hours
        FROM all_time at
        JOIN portfolio_projects p ON p.id = at.project_id
        WHERE at.related_object_type = 'project'
        GROUP BY at.project_id, p.name
        ORDER BY hours DESC
      ),
      -- Sum by category
      by_category AS (
        SELECT
          SUM(CASE WHEN category = 'it' THEN hours ELSE 0 END) as it_hours,
          SUM(CASE WHEN category = 'business' THEN hours ELSE 0 END) as business_hours
        FROM all_time
      ),
      -- Non-project task hours
      non_project_hours AS (
        SELECT COALESCE(SUM(hours), 0) as hours
        FROM task_time
        WHERE related_object_type IS DISTINCT FROM 'project'
      ),
      -- Total hours
      total AS (
        SELECT COALESCE(SUM(hours), 0) as hours FROM all_time
      )
      SELECT
        t.hours as total_hours,
        bc.it_hours,
        bc.business_hours,
        np.hours as non_project_hours,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'projectId', bp.project_id,
            'projectName', bp.project_name,
            'hours', bp.hours
          )) FROM by_project bp),
          '[]'::json
        ) as by_project
      FROM total t
      CROSS JOIN by_category bc
      CROSS JOIN non_project_hours np
      `,
      [userId, days],
    );

    const row = result[0] || {
      total_hours: 0,
      it_hours: 0,
      business_hours: 0,
      non_project_hours: 0,
      by_project: [],
    };

    return {
      totalHours: parseFloat(row.total_hours) || 0,
      byProject: row.by_project || [],
      byCategory: {
        it: parseFloat(row.it_hours) || 0,
        business: parseFloat(row.business_hours) || 0,
      },
      nonProjectTaskHours: parseFloat(row.non_project_hours) || 0,
    };
  }
}
