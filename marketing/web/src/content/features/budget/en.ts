import type { FeatureContent } from '../types';

const content: FeatureContent = {
  meta: {
    title: 'Budget management',
    description:
      'Multi-year IT budget planning, six allocation methods, multi-currency with World Bank rates, executive chargeback. Open source. Self-host free or cloud from €49/mo.',
  },
  header: {
    eyebrow: 'Budget management',
    title: 'Master your IT budget with complete visibility.',
    lead: 'Multi-year planning, intelligent cost allocation, executive-ready chargeback reports. Track OPEX and CAPEX across companies and departments.',
  },
  sections: [
    {
      title: 'Multi-year budget planning',
      body: 'Plan your IT budget across multiple years with dynamic columns for Budget, Revision, Follow-up and Landing. Track both OPEX and CAPEX in one unified view.',
      bullets: [
        'OPEX and CAPEX tracking in dedicated grids',
        'Dynamic Budget / Revision / Follow-up / Landing columns per year',
        'Year-over-year comparisons and trend analysis',
        'Bulk copy operations between budget years',
        'Freeze / unfreeze workflows for governance',
      ],
      shotAlt: 'Multi-year budget grid with dynamic columns',
    },
    {
      title: 'Intelligent cost allocation',
      body: 'Distribute IT costs across companies and departments using six different allocation methods. The system recomputes allocations when metrics change, with full transparency and audit trail.',
      bullets: [
        'Headcount-based allocation',
        'IT-users-based allocation',
        'Turnover-weighted allocation',
        'Manual company and department splits',
        'Proportional headcount default',
      ],
      shotAlt: 'Allocation editor showing six methods',
    },
    {
      title: 'Multi-currency with live rates',
      body: 'Work with multiple currencies while reporting in a single canonical currency. KANAP fetches live rates from the World Bank API and freezes rate snapshots when you lock a budget version.',
      bullets: [
        'Single reporting currency for all aggregates',
        'Automatic FX rates from the World Bank',
        'Frozen rate snapshots on budget freeze',
        'Configurable allowed currency list',
        'Historical rates for past fiscal years',
      ],
      shotAlt: 'Currency settings with World Bank rates',
    },
    {
      title: 'Executive chargeback reports',
      body: 'Generate board-ready chargeback reports showing IT cost distribution by company and department. Drill down from company totals to individual cost items with full transparency on allocation methods used.',
      bullets: [
        'Global chargeback report by company',
        'Company-level reports by department',
        'Itemized allocation breakdowns',
        'KPI metrics and share of total',
        'CSV export and chart downloads',
      ],
      shotAlt: 'Chargeback report with drill-down',
    },
  ],
  more: {
    title: 'More in budget',
    items: [
      { title: 'Task management', body: 'Assign follow-up tasks to OPEX and CAPEX items. Track due dates and completion.' },
      { title: 'Contract linking', body: 'Link spend items to contracts. Track renewal dates and cancellation deadlines.' },
      { title: 'Chart of accounts', body: 'Map costs to your accounting structure. Country-specific and global CoAs.' },
      { title: 'Data hygiene', body: 'Dashboard chips highlight missing owners, paying companies, and CoA mismatches.' },
    ],
  },
  crossLinks: {
    label: 'Explore other modules',
    links: [
      { label: 'IT landscape', href: '/features/it-landscape' },
      { label: 'Portfolio management', href: '/features/portfolio' },
      { label: 'Knowledge', href: '/features/knowledge' },
    ],
  },
  cta: {
    title: 'Ready to master your IT budget?',
    body: 'Start free with self-hosting, or try the cloud from €49/mo. All features on every plan.',
    primary: 'Start free trial',
    secondary: 'Talk to us',
  },
};

export default content;
