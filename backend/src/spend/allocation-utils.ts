export function formatAllocationMethodLabel(method?: string | null): string {
  switch (method) {
    case 'headcount':
      return 'Headcount';
    case 'it_users':
      return 'IT users';
    case 'turnover':
      return 'Turnover';
    case 'manual_company':
      return 'Company';
    case 'manual_department':
      return 'Department';
    case 'manual_pct':
      return 'Manual %';
    case 'default':
      return 'Default';
    default:
      return '';
  }
}
