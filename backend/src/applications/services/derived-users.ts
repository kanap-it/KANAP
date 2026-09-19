import { In } from 'typeorm';
import type { Application } from '../application.entity';

export type DerivedUsersInput = Pick<Application, 'id' | 'users_mode' | 'users_year' | 'users_override'>;

/**
 * Derived users of applications: the single rule behind the grid column and the
 * application's own total.
 *
 * Deriving the total per application issued 2-5 queries each, so a 20-row page cost
 * 60-100 round trips. The same totals are derived here with a fixed number of queries
 * for the whole page: the company/department links in one read, the departments in one
 * read, then one metrics read per fiscal year present in the page.
 */
export async function buildDerivedUsersByApp(apps: DerivedUsersInput[], mg: any): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  if (apps.length === 0) return out;

  const { ApplicationCompany } = await import('../application-company.entity');
  const { ApplicationDepartment } = await import('../application-department.entity');
  const { Department } = await import('../../departments/department.entity');
  const { CompanyMetric } = await import('../../companies/company-metric.entity');
  const { DepartmentMetric } = await import('../../departments/department-metric.entity');

  // `manual` needs no query at all: the override is already on the loaded row. A null
  // mode behaves like `headcount`, as it did before.
  const linked = apps.filter((a) => a.users_mode !== 'manual');

  const companiesByApp: Record<string, string[]> = {};
  const departmentsByApp: Record<string, string[]> = {};
  if (linked.length > 0) {
    const [companyLinks, departmentLinks] = await Promise.all([
      mg.getRepository(ApplicationCompany).find({ where: { application_id: In(linked.map((a) => a.id)) } as any }),
      mg.getRepository(ApplicationDepartment).find({ where: { application_id: In(linked.map((a) => a.id)) } as any }),
    ]);
    for (const l of companyLinks as any[]) (companiesByApp[l.application_id] ||= []).push(l.company_id);
    for (const l of departmentLinks as any[]) (departmentsByApp[l.application_id] ||= []).push(l.department_id);
  }

  // A department that belongs to one of the application's companies is skipped, so the
  // company metrics are not double counted.
  const departmentIds = [...new Set(Object.values(departmentsByApp).flat())];
  const departmentCompany: Record<string, string> = {};
  if (departmentIds.length > 0) {
    const rows = await mg.getRepository(Department).find({ where: { id: In(departmentIds) } });
    for (const d of rows as any[]) departmentCompany[d.id] = d.company_id;
  }

  const companyIds = [...new Set(Object.values(companiesByApp).flat())];
  const years = [...new Set(linked.map((a) => a.users_year).filter((y): y is number => y != null))];
  const companyMetrics: Record<string, { itUsers: number | null; headcount: number }> = {};
  const departmentHeadcount: Record<string, number> = {};
  if (years.length > 0) {
    const [companyRows, departmentRows] = await Promise.all([
      companyIds.length > 0
        ? mg.getRepository(CompanyMetric).find({ where: { company_id: In(companyIds), fiscal_year: In(years) } })
        : Promise.resolve([]),
      departmentIds.length > 0
        ? mg.getRepository(DepartmentMetric).find({ where: { department_id: In(departmentIds), fiscal_year: In(years) } })
        : Promise.resolve([]),
    ]);
    for (const m of companyRows as any[]) {
      const it = m.it_users;
      companyMetrics[`${m.company_id}|${m.fiscal_year}`] = {
        itUsers: typeof it === 'number' && it != null ? it : null,
        headcount: Number(m.headcount || 0),
      };
    }
    for (const m of departmentRows as any[]) {
      departmentHeadcount[`${m.department_id}|${m.fiscal_year}`] = Number(m.headcount || 0);
    }
  }

  for (const app of apps) {
    if (app.users_mode === 'manual') {
      out[app.id] = Math.max(0, Number(app.users_override || 0));
      continue;
    }
    const appCompanyIds = companiesByApp[app.id] || [];
    const appCompanyIdSet = new Set(appCompanyIds);
    const appDepartmentIds = (departmentsByApp[app.id] || []).filter((id) => !appCompanyIdSet.has(departmentCompany[id]));
    let total = 0;
    for (const companyId of appCompanyIdSet) {
      const metric = companyMetrics[`${companyId}|${app.users_year}`];
      if (!metric) continue;
      total += app.users_mode === 'it_users' ? (metric.itUsers ?? metric.headcount) : metric.headcount;
    }
    for (const departmentId of appDepartmentIds) {
      total += departmentHeadcount[`${departmentId}|${app.users_year}`] || 0;
    }
    out[app.id] = total;
  }

  return out;
}
