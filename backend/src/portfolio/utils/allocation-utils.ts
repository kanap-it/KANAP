export interface AllocationUser {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface Allocation {
  user_id: string;
  allocation_pct: number;
}

const LEAD_OVERHEAD_PCT = 10;
const TEAM_POOL_PCT = 90;

function normalizeName(user: AllocationUser): string {
  const first = (user.first_name ?? '').trim().toLowerCase();
  const last = (user.last_name ?? '').trim().toLowerCase();
  return `${first} ${last}`.trim();
}

export function distributeEvenly(
  users: Array<{ id: string }>,
  totalPct: number,
): Allocation[] {
  if (users.length === 0) return [];

  const baseShare = Math.floor(totalPct / users.length);
  const remainder = totalPct - baseShare * users.length;
  return users.map((user, index) => ({
    user_id: user.id,
    allocation_pct: baseShare + (index < remainder ? 1 : 0),
  }));
}

export function computeAutoAllocations(
  lead: AllocationUser | null,
  teamMembers: AllocationUser[],
): Allocation[] {
  const eligible = new Map<string, AllocationUser & { is_lead: boolean }>();
  if (lead) {
    eligible.set(lead.id, { ...lead, is_lead: true });
  }

  let leadIsAlsoContributor = false;
  for (const member of teamMembers) {
    if (!member?.id) continue;
    if (eligible.has(member.id)) {
      leadIsAlsoContributor = true;
      continue;
    }
    eligible.set(member.id, { ...member, is_lead: false });
  }

  if (eligible.size === 0) return [];

  const users = Array.from(eligible.values());
  users.sort((a, b) => {
    if (a.is_lead && !b.is_lead) return -1;
    if (!a.is_lead && b.is_lead) return 1;
    const byName = normalizeName(a).localeCompare(normalizeName(b));
    if (byName !== 0) return byName;
    return a.id.localeCompare(b.id);
  });

  const hasLead = lead != null && eligible.has(lead.id);
  if (!hasLead) {
    return distributeEvenly(users, 100);
  }

  if (users.length === 1) {
    return [{ user_id: users[0].id, allocation_pct: 100 }];
  }

  const leadUser = users.find((u) => u.is_lead) ?? users[0];
  const poolUsers = leadIsAlsoContributor
    ? users
    : users.filter((u) => !u.is_lead);

  if (poolUsers.length === 0) {
    return [{ user_id: leadUser.id, allocation_pct: 100 }];
  }

  const poolAllocations = distributeEvenly(poolUsers, TEAM_POOL_PCT);
  if (leadIsAlsoContributor) {
    return poolAllocations.map((entry) => ({
      user_id: entry.user_id,
      allocation_pct: entry.user_id === leadUser.id
        ? entry.allocation_pct + LEAD_OVERHEAD_PCT
        : entry.allocation_pct,
    }));
  }

  return [
    { user_id: leadUser.id, allocation_pct: LEAD_OVERHEAD_PCT },
    ...poolAllocations,
  ];
}
