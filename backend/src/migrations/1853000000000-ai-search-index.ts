import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unified AI entity search index (Phase B of planning/search-revamp.md).
 *
 * One denormalized, trigger-maintained table (`search_index`) replaces the ~20
 * sequential per-entity ILIKE scans in AiEntityService.searchAll with a single
 * indexed query (GIN tsvector + pg_trgm on label).
 *
 * MAINTENANCE CONTRACT
 * - Searchable fields for entity X live in `search_index_refresh_<x>()` below.
 *   Adding a searchable column = update that function in a new migration + run
 *   a reindex (POST /ai/admin/search-index/reindex or the daily job).
 * - Sync: AFTER ROW triggers on each source table call the per-type refresh
 *   function. Related-entity renames (user display name, company name, …) are
 *   NOT trigger-cascaded: such rows go stale until the source row is touched
 *   or the daily reindex job runs. This staleness is a deliberate trade-off.
 * - Participation/visibility scope is NEVER baked into the index — it is
 *   enforced query-time in AiEntityService (EXISTS against source tables).
 *
 * Vector weights: A = ref + label/name/title (+ user email), B = status and
 * category/type/stream/lifecycle-ish fields, C = descriptions, notes,
 * related-entity names, labels, aliases. Both kanap_fr and kanap_en configs
 * (from migration 1852900000000) are used via search_index_tsv().
 */

type SearchIndexTypeSpec = {
  type: string;
  table: string;
  alias: string;
  joins?: string;
  refPrefix: string;
  refNumber: string;
  label: string;
  summary: string;
  status: string;
  extraJson: string;
  vector: string;
  updatedAt: string;
};

const USER_NAME = (alias: string): string =>
  `COALESCE(NULLIF(TRIM(CONCAT(${alias}.first_name, ' ', ${alias}.last_name)), ''), ${alias}.email)`;

const PROJECT_TEAM_VECTOR = (alias: string): string => `(
  SELECT string_agg(DISTINCT ${USER_NAME('u_tm')}, ' ')
  FROM portfolio_project_team pt_v
  JOIN users u_tm ON u_tm.id = pt_v.user_id AND u_tm.tenant_id = ${alias}.tenant_id
  WHERE pt_v.project_id = ${alias}.id AND pt_v.tenant_id = ${alias}.tenant_id
)`;

const PROJECT_TEAM_DISPLAY = (alias: string): string => `(
  SELECT string_agg(name, ', ' ORDER BY name)
  FROM (
    SELECT DISTINCT ${USER_NAME('u_tm')} AS name
    FROM portfolio_project_team pt_d
    JOIN users u_tm ON u_tm.id = pt_d.user_id AND u_tm.tenant_id = ${alias}.tenant_id
    WHERE pt_d.project_id = ${alias}.id AND pt_d.tenant_id = ${alias}.tenant_id
  ) contributor
)`;

const REQUEST_TEAM_VECTOR = (alias: string): string => `(
  SELECT string_agg(DISTINCT ${USER_NAME('u_tm')}, ' ')
  FROM portfolio_request_team rt_v
  JOIN users u_tm ON u_tm.id = rt_v.user_id AND u_tm.tenant_id = ${alias}.tenant_id
  WHERE rt_v.request_id = ${alias}.id AND rt_v.tenant_id = ${alias}.tenant_id
)`;

const REQUEST_TEAM_DISPLAY = (alias: string): string => `(
  SELECT string_agg(name, ', ' ORDER BY name)
  FROM (
    SELECT DISTINCT ${USER_NAME('u_tm')} AS name
    FROM portfolio_request_team rt_d
    JOIN users u_tm ON u_tm.id = rt_d.user_id AND u_tm.tenant_id = ${alias}.tenant_id
    WHERE rt_d.request_id = ${alias}.id AND rt_d.tenant_id = ${alias}.tenant_id
  ) contributor
)`;

const APPLICATION_OWNERS = (alias: string, ownerType: 'business' | 'it', separator: string): string => `(
  SELECT string_agg(name, '${separator}' ORDER BY name)
  FROM (
    SELECT DISTINCT ${USER_NAME('u_owner')} AS name
    FROM application_owners ao
    JOIN users u_owner ON u_owner.id = ao.user_id AND u_owner.tenant_id = ${alias}.tenant_id
    WHERE ao.application_id = ${alias}.id
      AND ao.tenant_id = ${alias}.tenant_id
      AND ao.owner_type = '${ownerType}'
  ) owner
)`;

const PROJECT_SUMMARY = (alias: string): string => `NULLIF(CONCAT_WS(' | ',
  CASE
    WHEN ${alias}.origin IS NOT NULL AND ${alias}.origin <> 'standard'
    THEN CONCAT('Origin: ', ${alias}.origin)
    ELSE NULL
  END,
  CASE
    WHEN COALESCE(${alias}.execution_progress, 0) > 0
    THEN CONCAT('Effort: ', ROUND(${alias}.execution_progress)::int, '%')
    ELSE NULL
  END,
  CASE
    WHEN ${alias}.planned_end IS NOT NULL
    THEN CONCAT('Target end: ', ${alias}.planned_end::text)
    ELSE NULL
  END
), '')`;

function textRefPrefix(column: string, prefix: string): string {
  return `CASE WHEN ${column} ~* '^${prefix}-[0-9]+$' THEN '${prefix}' ELSE NULL END`;
}

function textRefNumber(column: string, prefix: string): string {
  return `CASE WHEN ${column} ~* '^${prefix}-[0-9]+$' THEN NULLIF(regexp_replace(${column}, '^${prefix}-', '', 'i'), '')::int ELSE NULL END`;
}

function tsv(weight: 'A' | 'B' | 'C', expr: string): string {
  return `search_index_tsv('${weight}', ${expr})`;
}

const TYPE_SPECS: SearchIndexTypeSpec[] = [
  {
    type: 'accounts',
    table: 'accounts',
    alias: 'a',
    joins: `LEFT JOIN chart_of_accounts coa ON coa.id = a.coa_id AND coa.tenant_id = a.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: `COALESCE(NULLIF(TRIM(CONCAT_WS(' - ', a.account_number::text, a.account_name)), ''), '')`,
    summary: `COALESCE(NULLIF(a.description, ''), NULLIF(a.native_name, ''), coa.code)`,
    status: 'a.status::text',
    extraJson: `jsonb_build_object('coa_code', coa.code)`,
    vector: [
      tsv('A', `CONCAT_WS(' ', a.account_number::text, a.account_name)`),
      tsv('C', `CONCAT_WS(' ', a.native_name, a.description, a.consolidation_account_name, a.consolidation_account_description, coa.code)`),
    ].join(' || '),
    updatedAt: 'a.updated_at',
  },
  {
    type: 'analytics_categories',
    table: 'analytics_categories',
    alias: 'ac',
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'ac.name',
    summary: 'ac.description',
    status: 'ac.status::text',
    extraJson: 'NULL',
    vector: [
      tsv('A', 'ac.name'),
      tsv('B', 'ac.status::text'),
      tsv('C', 'ac.description'),
    ].join(' || '),
    updatedAt: 'ac.updated_at',
  },
  {
    type: 'applications',
    table: 'applications',
    alias: 'a',
    joins: `LEFT JOIN suppliers s ON s.id = a.supplier_id AND s.tenant_id = a.tenant_id`,
    refPrefix: textRefPrefix('a.sequential_id', 'APP'),
    refNumber: textRefNumber('a.sequential_id', 'APP'),
    label: 'a.name',
    summary: 'a.description',
    status: 'a.status::text',
    extraJson: `jsonb_build_object(
      'item_ref', a.sequential_id,
      'lifecycle', a.lifecycle,
      'criticality', a.criticality,
      'category', a.category,
      'hosting_model', a.hosting_model,
      'data_class', a.data_class,
      'version', a.version,
      'supplier', s.name,
      'business_owner', NULLIF(${APPLICATION_OWNERS('a', 'business', ', ')}, ''),
      'it_owner', NULLIF(${APPLICATION_OWNERS('a', 'it', ', ')}, '')
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', a.sequential_id, a.name)`),
      tsv('B', `CONCAT_WS(' ', a.category, a.lifecycle, a.criticality, a.status::text, a.data_class, a.hosting_model, a.version, a.licensing)`),
      tsv('C', `CONCAT_WS(' ', a.description, a.editor, a.notes, a.support_notes, s.name, ${APPLICATION_OWNERS('a', 'business', ' ')}, ${APPLICATION_OWNERS('a', 'it', ' ')})`),
    ].join(' || '),
    updatedAt: 'a.updated_at',
  },
  {
    type: 'assets',
    table: 'assets',
    alias: 'a',
    refPrefix: textRefPrefix('a.asset_reference', 'AST'),
    refNumber: textRefNumber('a.asset_reference', 'AST'),
    label: 'a.name',
    summary: `COALESCE(a.fqdn, a.hostname, a.notes)`,
    status: 'a.status::text',
    extraJson: `jsonb_build_object('item_ref', a.asset_reference)`,
    vector: [
      tsv('A', `CONCAT_WS(' ', a.asset_reference, a.name)`),
      tsv('B', `CONCAT_WS(' ', a.kind, a.provider, a.environment, a.operating_system, a.status::text, a.domain, a.cluster, a.region, a.zone)`),
      tsv('C', `CONCAT_WS(' ', a.fqdn, a.hostname, a.notes, array_to_string(COALESCE(a.aliases, '{}'), ' '))`),
    ].join(' || '),
    updatedAt: 'a.updated_at',
  },
  {
    type: 'business_processes',
    table: 'business_processes',
    alias: 'bp',
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'bp.name',
    summary: `COALESCE(NULLIF(bp.description, ''), NULLIF(bp.notes, ''), (
      SELECT c.name
      FROM business_process_category_links l
      JOIN business_process_categories c ON c.id = l.category_id AND c.tenant_id = bp.tenant_id
      WHERE l.process_id = bp.id AND l.tenant_id = bp.tenant_id
      ORDER BY c.name ASC
      LIMIT 1
    ))`,
    status: 'bp.status::text',
    extraJson: `jsonb_build_object('primary_category', (
      SELECT c.name
      FROM business_process_category_links l
      JOIN business_process_categories c ON c.id = l.category_id AND c.tenant_id = bp.tenant_id
      WHERE l.process_id = bp.id AND l.tenant_id = bp.tenant_id
      ORDER BY c.name ASC
      LIMIT 1
    ))`,
    vector: [
      tsv('A', 'bp.name'),
      tsv('B', 'bp.status::text'),
      tsv('C', `CONCAT_WS(' ', bp.description, bp.notes, (
        SELECT string_agg(c.name, ' ' ORDER BY c.name)
        FROM business_process_category_links l
        JOIN business_process_categories c ON c.id = l.category_id AND c.tenant_id = bp.tenant_id
        WHERE l.process_id = bp.id AND l.tenant_id = bp.tenant_id
      ))`),
    ].join(' || '),
    updatedAt: 'bp.updated_at',
  },
  {
    type: 'capex_items',
    table: 'capex_items',
    alias: 'ci',
    joins: `LEFT JOIN companies comp ON comp.id = ci.paying_company_id AND comp.tenant_id = ci.tenant_id
       LEFT JOIN suppliers sup ON sup.id = ci.supplier_id AND sup.tenant_id = ci.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'ci.description',
    summary: `NULLIF(CONCAT_WS(' | ', comp.name, sup.name, ci.ppe_type::text, ci.investment_type), '')`,
    status: 'ci.status::text',
    extraJson: `jsonb_build_object('paying_company', comp.name, 'supplier', sup.name)`,
    vector: [
      tsv('A', 'ci.description'),
      tsv('B', `CONCAT_WS(' ', ci.ppe_type::text, ci.investment_type, ci.priority, ci.currency)`),
      tsv('C', `CONCAT_WS(' ', ci.notes, comp.name, sup.name)`),
    ].join(' || '),
    updatedAt: 'ci.updated_at',
  },
  {
    type: 'chart_of_accounts',
    table: 'chart_of_accounts',
    alias: 'coa',
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: `COALESCE(NULLIF(TRIM(CONCAT_WS(' - ', coa.code, coa.name)), ''), '')`,
    summary: `NULLIF(CONCAT_WS(' | ', coa.scope, coa.country_iso), '')`,
    status: 'NULL',
    extraJson: 'NULL',
    vector: [
      tsv('A', `CONCAT_WS(' ', coa.code, coa.name)`),
      tsv('B', `CONCAT_WS(' ', coa.country_iso, coa.scope)`),
    ].join(' || '),
    updatedAt: 'coa.updated_at',
  },
  {
    type: 'companies',
    table: 'companies',
    alias: 'c',
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'c.name',
    summary: `NULLIF(CONCAT_WS(', ', c.city, c.country_iso), '')`,
    status: 'c.status::text',
    extraJson: `jsonb_build_object('base_currency', c.base_currency)`,
    vector: [
      tsv('A', 'c.name'),
      tsv('B', `CONCAT_WS(' ', c.country_iso, c.base_currency)`),
      tsv('C', `CONCAT_WS(' ', c.city, c.address1, c.address2, c.postal_code, c.reg_number, c.vat_number, c.notes)`),
    ].join(' || '),
    updatedAt: 'c.updated_at',
  },
  {
    type: 'connections',
    table: 'connections',
    alias: 'cn',
    joins: `LEFT JOIN assets src ON src.id = cn.source_asset_id AND src.tenant_id = cn.tenant_id
       LEFT JOIN assets dst ON dst.id = cn.destination_asset_id AND dst.tenant_id = cn.tenant_id`,
    refPrefix: textRefPrefix('cn.connection_reference', 'CONN'),
    refNumber: textRefNumber('cn.connection_reference', 'CONN'),
    label: `COALESCE(NULLIF(TRIM(CONCAT_WS(' - ', cn.connection_reference, cn.name)), ''), '')`,
    summary: `COALESCE(NULLIF(cn.description, ''), NULLIF(CONCAT_WS(' | ', src.name, dst.name), ''))`,
    status: 'cn.lifecycle',
    extraJson: `jsonb_build_object('source', src.name, 'destination', dst.name)`,
    vector: [
      tsv('A', `CONCAT_WS(' ', cn.connection_reference, cn.name)`),
      tsv('B', `CONCAT_WS(' ', cn.topology, cn.lifecycle, cn.criticality, cn.data_class, (
        SELECT string_agg(cp.connection_type_code, ' ')
        FROM connection_protocols cp
        WHERE cp.connection_id = cn.id AND cp.tenant_id = cn.tenant_id
      ))`),
      tsv('C', `CONCAT_WS(' ', cn.description, src.name, dst.name)`),
    ].join(' || '),
    updatedAt: 'cn.updated_at',
  },
  {
    type: 'contacts',
    table: 'contacts',
    alias: 'c',
    joins: `LEFT JOIN suppliers sup ON sup.id = c.supplier_id AND sup.tenant_id = c.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: `COALESCE(NULLIF(TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), ''), c.email)`,
    summary: `NULLIF(CONCAT_WS(' | ', c.job_title, sup.name, c.country), '')`,
    status: `CASE WHEN c.active THEN 'active' ELSE 'inactive' END`,
    extraJson: `jsonb_build_object('supplier', sup.name)`,
    vector: [
      tsv('A', `CONCAT_WS(' ', c.first_name, c.last_name, c.email)`),
      tsv('B', 'c.country'),
      tsv('C', `CONCAT_WS(' ', c.job_title, c.phone, c.mobile, c.notes, sup.name)`),
    ].join(' || '),
    updatedAt: 'c.updated_at',
  },
  {
    type: 'contracts',
    table: 'contracts',
    alias: 'c',
    joins: `LEFT JOIN companies comp ON comp.id = c.company_id AND comp.tenant_id = c.tenant_id
       LEFT JOIN suppliers sup ON sup.id = c.supplier_id AND sup.tenant_id = c.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'c.name',
    summary: `COALESCE(NULLIF(c.notes, ''), NULLIF(CONCAT_WS(' | ', comp.name, sup.name), ''))`,
    status: 'c.status::text',
    extraJson: `jsonb_build_object('company', comp.name, 'supplier', sup.name)`,
    vector: [
      tsv('A', 'c.name'),
      tsv('B', `CONCAT_WS(' ', c.currency, c.billing_frequency)`),
      tsv('C', `CONCAT_WS(' ', c.notes, comp.name, sup.name)`),
    ].join(' || '),
    updatedAt: 'c.updated_at',
  },
  {
    type: 'departments',
    table: 'departments',
    alias: 'd',
    joins: `LEFT JOIN companies comp ON comp.id = d.company_id AND comp.tenant_id = d.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 'd.name',
    summary: `COALESCE(NULLIF(d.description, ''), comp.name)`,
    status: 'd.status::text',
    extraJson: `jsonb_build_object('company', comp.name)`,
    vector: [
      tsv('A', 'd.name'),
      tsv('B', 'd.status::text'),
      tsv('C', `CONCAT_WS(' ', d.description, comp.name)`),
    ].join(' || '),
    updatedAt: 'd.updated_at',
  },
  {
    type: 'documents',
    table: 'documents',
    alias: 'd',
    refPrefix: `'DOC'`,
    refNumber: 'd.item_number',
    label: 'd.title',
    summary: 'd.summary',
    status: 'd.status::text',
    extraJson: 'NULL',
    // Reuse the bilingual vector maintained by documents_search_vector_sync()
    // (title/summary weight A, content_plain weight B) and add the DOC ref.
    vector: `${tsv('A', `'DOC-' || d.item_number::text`)} || COALESCE(d.search_vector, ''::tsvector)`,
    updatedAt: 'd.updated_at',
  },
  {
    type: 'interfaces',
    table: 'interfaces',
    alias: 'i',
    joins: `LEFT JOIN applications sa ON sa.id = i.source_application_id AND sa.tenant_id = i.tenant_id
       LEFT JOIN applications ta ON ta.id = i.target_application_id AND ta.tenant_id = i.tenant_id
       LEFT JOIN business_processes bp ON bp.id = i.business_process_id AND bp.tenant_id = i.tenant_id`,
    refPrefix: textRefPrefix('i.interface_reference', 'INT'),
    refNumber: textRefNumber('i.interface_reference', 'INT'),
    label: `COALESCE(NULLIF(TRIM(CONCAT_WS(' - ', i.interface_reference, i.name)), ''), '')`,
    summary: `COALESCE(NULLIF(i.business_purpose, ''), NULLIF(CONCAT_WS(' | ', sa.name, ta.name), ''))`,
    status: 'i.lifecycle',
    extraJson: `jsonb_build_object('source_application', sa.name, 'target_application', ta.name, 'business_process', bp.name)`,
    vector: [
      tsv('A', `CONCAT_WS(' ', i.interface_reference, i.interface_id, i.name)`),
      tsv('B', `CONCAT_WS(' ', i.lifecycle, i.criticality, i.data_category, i.data_class)`),
      tsv('C', `CONCAT_WS(' ', i.business_purpose, i.overview_notes, sa.name, ta.name, bp.name)`),
    ].join(' || '),
    updatedAt: 'i.updated_at',
  },
  {
    type: 'locations',
    table: 'locations',
    alias: 'l',
    refPrefix: textRefPrefix('l.location_reference', 'LOC'),
    refNumber: textRefNumber('l.location_reference', 'LOC'),
    label: `l.location_reference || ' — ' || l.name`,
    summary: `COALESCE(NULLIF(l.city, ''), l.country_iso)`,
    status: 'NULL',
    extraJson: 'NULL',
    vector: [
      tsv('A', `CONCAT_WS(' ', l.location_reference, l.name)`),
      tsv('B', `CONCAT_WS(' ', l.country_iso, l.hosting_type, l.provider)`),
      tsv('C', `CONCAT_WS(' ', l.city, (
        SELECT string_agg(CONCAT_WS(' ', sl.name, sl.description), ' ')
        FROM location_sub_items sl
        WHERE sl.location_id = l.id AND sl.tenant_id = l.tenant_id
      ))`),
    ].join(' || '),
    updatedAt: 'l.updated_at',
  },
  {
    type: 'projects',
    table: 'portfolio_projects',
    alias: 'p',
    joins: `LEFT JOIN portfolio_categories pc ON pc.id = p.category_id AND pc.tenant_id = p.tenant_id
       LEFT JOIN portfolio_streams ps ON ps.id = p.stream_id AND ps.tenant_id = p.tenant_id
       LEFT JOIN companies co ON co.id = p.company_id AND co.tenant_id = p.tenant_id
       LEFT JOIN departments dep ON dep.id = p.department_id AND dep.tenant_id = p.tenant_id
       LEFT JOIN users u_bs ON u_bs.id = p.business_sponsor_id AND u_bs.tenant_id = p.tenant_id
       LEFT JOIN users u_bl ON u_bl.id = p.business_lead_id AND u_bl.tenant_id = p.tenant_id
       LEFT JOIN users u_is ON u_is.id = p.it_sponsor_id AND u_is.tenant_id = p.tenant_id
       LEFT JOIN users u_il ON u_il.id = p.it_lead_id AND u_il.tenant_id = p.tenant_id`,
    refPrefix: `'PRJ'`,
    refNumber: 'p.item_number',
    label: 'p.name',
    summary: PROJECT_SUMMARY('p'),
    status: 'p.status::text',
    extraJson: `jsonb_build_object(
      'business_lead', NULLIF(${USER_NAME('u_bl')}, ''),
      'it_lead', NULLIF(${USER_NAME('u_il')}, ''),
      'contributors', NULLIF(${PROJECT_TEAM_DISPLAY('p')}, '')
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', 'PRJ-' || p.item_number::text, p.name)`),
      tsv('B', `CONCAT_WS(' ', p.status::text, p.origin, pc.name, ps.name)`),
      tsv('C', `CONCAT_WS(' ', p.override_justification, co.name, dep.name, ${USER_NAME('u_bs')}, ${USER_NAME('u_bl')}, ${USER_NAME('u_is')}, ${USER_NAME('u_il')}, ${PROJECT_TEAM_VECTOR('p')})`),
    ].join(' || '),
    updatedAt: 'p.updated_at',
  },
  {
    type: 'requests',
    table: 'portfolio_requests',
    alias: 'r',
    joins: `LEFT JOIN portfolio_categories pc ON pc.id = r.category_id AND pc.tenant_id = r.tenant_id
       LEFT JOIN portfolio_streams ps ON ps.id = r.stream_id AND ps.tenant_id = r.tenant_id
       LEFT JOIN companies co ON co.id = r.company_id AND co.tenant_id = r.tenant_id
       LEFT JOIN departments dep ON dep.id = r.department_id AND dep.tenant_id = r.tenant_id
       LEFT JOIN users u_req ON u_req.id = r.requestor_id AND u_req.tenant_id = r.tenant_id
       LEFT JOIN users u_bs ON u_bs.id = r.business_sponsor_id AND u_bs.tenant_id = r.tenant_id
       LEFT JOIN users u_bl ON u_bl.id = r.business_lead_id AND u_bl.tenant_id = r.tenant_id
       LEFT JOIN users u_is ON u_is.id = r.it_sponsor_id AND u_is.tenant_id = r.tenant_id
       LEFT JOIN users u_il ON u_il.id = r.it_lead_id AND u_il.tenant_id = r.tenant_id`,
    refPrefix: `'REQ'`,
    refNumber: 'r.item_number',
    label: 'r.name',
    summary: `COALESCE(NULLIF(r.current_situation, ''), NULLIF(r.expected_benefits, ''))`,
    status: 'r.status::text',
    extraJson: `jsonb_build_object(
      'requestor', NULLIF(${USER_NAME('u_req')}, ''),
      'business_lead', NULLIF(${USER_NAME('u_bl')}, ''),
      'it_lead', NULLIF(${USER_NAME('u_il')}, ''),
      'contributors', NULLIF(${REQUEST_TEAM_DISPLAY('r')}, '')
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', 'REQ-' || r.item_number::text, r.name)`),
      tsv('B', `CONCAT_WS(' ', r.status::text, pc.name, ps.name)`),
      tsv('C', `CONCAT_WS(' ', r.current_situation, r.expected_benefits, r.override_justification, co.name, dep.name, ${USER_NAME('u_req')}, ${USER_NAME('u_bs')}, ${USER_NAME('u_bl')}, ${USER_NAME('u_is')}, ${USER_NAME('u_il')}, ${REQUEST_TEAM_VECTOR('r')})`),
    ].join(' || '),
    updatedAt: 'r.updated_at',
  },
  {
    type: 'spend_items',
    table: 'spend_items',
    alias: 'si',
    joins: `LEFT JOIN suppliers sup ON sup.id = si.supplier_id AND sup.tenant_id = si.tenant_id
       LEFT JOIN companies comp ON comp.id = si.paying_company_id AND comp.tenant_id = si.tenant_id
       LEFT JOIN accounts acc ON acc.id = si.account_id AND acc.tenant_id = si.tenant_id`,
    refPrefix: `'OPX'`,
    refNumber: 'si.item_number',
    label: 'si.product_name',
    summary: `COALESCE(
      NULLIF(si.description, ''),
      NULLIF(CONCAT_WS(' | ', sup.name, comp.name, NULLIF(TRIM(CONCAT_WS(' ', acc.account_number::text, acc.account_name)), '')), '')
    )`,
    status: 'si.status::text',
    extraJson: `jsonb_build_object(
      'supplier', sup.name,
      'paying_company', comp.name,
      'account', NULLIF(TRIM(CONCAT_WS(' ', acc.account_number::text, acc.account_name)), ''),
      'contract', (
        SELECT c.name
        FROM contract_spend_items csi
        JOIN contracts c ON c.id = csi.contract_id AND c.tenant_id = si.tenant_id
        WHERE csi.spend_item_id = si.id
        ORDER BY csi.created_at DESC
        LIMIT 1
      )
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', 'OPX-' || si.item_number::text, si.product_name)`),
      tsv('B', 'si.currency'),
      tsv('C', `CONCAT_WS(' ', si.description, sup.name, comp.name, acc.account_name, acc.account_number::text, si.notes, (
        SELECT string_agg(c.name, ' ')
        FROM contract_spend_items csi
        JOIN contracts c ON c.id = csi.contract_id AND c.tenant_id = si.tenant_id
        WHERE csi.spend_item_id = si.id
      ))`),
    ].join(' || '),
    updatedAt: 'si.updated_at',
  },
  {
    type: 'suppliers',
    table: 'suppliers',
    alias: 's',
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: 's.name',
    summary: `COALESCE(NULLIF(s.notes, ''), s.erp_supplier_id)`,
    status: 's.status::text',
    extraJson: `jsonb_build_object('erp_supplier_id', s.erp_supplier_id)`,
    vector: [
      tsv('A', 's.name'),
      tsv('B', 's.erp_supplier_id'),
      tsv('C', 's.notes'),
    ].join(' || '),
    updatedAt: 's.updated_at',
  },
  {
    type: 'tasks',
    table: 'tasks',
    alias: 't',
    joins: `LEFT JOIN users u_assign ON u_assign.id = t.assignee_user_id AND u_assign.tenant_id = t.tenant_id
       LEFT JOIN users u_creator ON u_creator.id = t.creator_id AND u_creator.tenant_id = t.tenant_id
       LEFT JOIN portfolio_task_types tt ON tt.id = t.task_type_id AND tt.tenant_id = t.tenant_id
       LEFT JOIN companies co ON co.id = t.company_id AND co.tenant_id = t.tenant_id
       LEFT JOIN portfolio_categories pc ON pc.id = t.category_id AND pc.tenant_id = t.tenant_id
       LEFT JOIN portfolio_streams ps ON ps.id = t.stream_id AND ps.tenant_id = t.tenant_id
       LEFT JOIN portfolio_projects rel_proj ON rel_proj.id = t.related_object_id AND t.related_object_type = 'project' AND rel_proj.tenant_id = t.tenant_id
       LEFT JOIN spend_items rel_si ON rel_si.id = t.related_object_id AND t.related_object_type = 'spend_item' AND rel_si.tenant_id = t.tenant_id
       LEFT JOIN contracts rel_ct ON rel_ct.id = t.related_object_id AND t.related_object_type = 'contract' AND rel_ct.tenant_id = t.tenant_id
       LEFT JOIN capex_items rel_cx ON rel_cx.id = t.related_object_id AND t.related_object_type = 'capex_item' AND rel_cx.tenant_id = t.tenant_id`,
    refPrefix: `'T'`,
    refNumber: 't.item_number',
    label: `COALESCE(t.title, 'Untitled task')`,
    summary: 't.description',
    status: 't.status::text',
    extraJson: `jsonb_build_object(
      'assignee', NULLIF(${USER_NAME('u_assign')}, ''),
      'creator', NULLIF(${USER_NAME('u_creator')}, '')
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', 'T-' || t.item_number::text, t.title)`),
      tsv('B', `CONCAT_WS(' ', t.status::text, t.priority_level, t.related_object_type, tt.name, pc.name, ps.name)`),
      tsv('C', `CONCAT_WS(' ', t.description, ${USER_NAME('u_assign')}, ${USER_NAME('u_creator')}, co.name, rel_proj.name, rel_si.product_name, rel_ct.name, rel_cx.description, (
        SELECT string_agg(lbl, ' ')
        FROM jsonb_array_elements_text(COALESCE(t.labels, '[]'::jsonb)) lbl
      ))`),
    ].join(' || '),
    updatedAt: 't.updated_at',
  },
  {
    type: 'users',
    table: 'users',
    alias: 'u',
    joins: `LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
       LEFT JOIN companies c ON c.id = u.company_id AND c.tenant_id = u.tenant_id
       LEFT JOIN departments d ON d.id = u.department_id AND d.tenant_id = u.tenant_id
       LEFT JOIN portfolio_team_member_configs tmc ON tmc.user_id = u.id AND tmc.tenant_id = u.tenant_id
       LEFT JOIN portfolio_teams pt ON pt.id = tmc.team_id AND pt.tenant_id = u.tenant_id`,
    refPrefix: 'NULL',
    refNumber: 'NULL',
    label: USER_NAME('u'),
    summary: `NULLIF(CONCAT_WS(' | ',
      CASE WHEN ${USER_NAME('u')} <> u.email THEN u.email ELSE NULL END,
      NULLIF(u.job_title, ''),
      NULLIF(pt.name, ''),
      NULLIF(c.name, '')
    ), '')`,
    status: 'u.status::text',
    extraJson: `jsonb_build_object(
      'email', u.email,
      'job_title', u.job_title,
      'primary_role', r.role_name,
      'company', c.name,
      'department', d.name,
      'locale', u.locale,
      'team', pt.name,
      'contributor_profile', CASE WHEN tmc.id IS NULL THEN 'not_configured' ELSE 'configured' END,
      'project_availability', tmc.project_availability,
      'areas_of_expertise', NULLIF((
        SELECT string_agg(DISTINCT area.value, ', ' ORDER BY area.value)
        FROM jsonb_array_elements_text(COALESCE(tmc.areas_of_expertise, '[]'::jsonb)) area(value)
      ), '')
    )`,
    vector: [
      tsv('A', `CONCAT_WS(' ', ${USER_NAME('u')}, u.email)`),
      tsv('B', `CONCAT_WS(' ', r.role_name, pt.name)`),
      tsv('C', `CONCAT_WS(' ', u.job_title, c.name, d.name, (
        SELECT string_agg(DISTINCT area.value, ' ')
        FROM jsonb_array_elements_text(COALESCE(tmc.areas_of_expertise, '[]'::jsonb)) area(value)
      ))`),
    ].join(' || '),
    updatedAt: 'u.updated_at',
  },
];

/**
 * Membership/link tables whose rows are part of a parent entity's indexed
 * document (team members, owners, sub-items, protocols, category links…).
 * Unlike related-entity RENAMES (daily-reindex territory), adding/removing a
 * membership row must refresh the parent immediately — the legacy per-type
 * searches reflected these joins live.
 */
type SearchIndexLinkSpec = {
  table: string;
  parentType: string;
  parentColumn: string;
};

const LINK_SPECS: SearchIndexLinkSpec[] = [
  { table: 'portfolio_team_member_configs', parentType: 'users', parentColumn: 'user_id' },
  { table: 'portfolio_project_team', parentType: 'projects', parentColumn: 'project_id' },
  { table: 'portfolio_request_team', parentType: 'requests', parentColumn: 'request_id' },
  { table: 'application_owners', parentType: 'applications', parentColumn: 'application_id' },
  { table: 'location_sub_items', parentType: 'locations', parentColumn: 'location_id' },
  { table: 'connection_protocols', parentType: 'connections', parentColumn: 'connection_id' },
  { table: 'contract_spend_items', parentType: 'spend_items', parentColumn: 'spend_item_id' },
  { table: 'business_process_category_links', parentType: 'business_processes', parentColumn: 'process_id' },
];

function linkTriggerSql(spec: SearchIndexLinkSpec): string {
  return `
    CREATE OR REPLACE FUNCTION search_index_sync_link_${spec.table}()
    RETURNS trigger AS $fn$
    BEGIN
      IF TG_OP IN ('DELETE', 'UPDATE') THEN
        PERFORM search_index_refresh_${spec.parentType}(OLD.tenant_id, ARRAY[OLD.${spec.parentColumn}]);
      END IF;
      IF TG_OP IN ('INSERT', 'UPDATE')
         AND (TG_OP = 'INSERT' OR NEW.${spec.parentColumn} IS DISTINCT FROM OLD.${spec.parentColumn}) THEN
        PERFORM search_index_refresh_${spec.parentType}(NEW.tenant_id, ARRAY[NEW.${spec.parentColumn}]);
      END IF;
      RETURN COALESCE(NEW, OLD);
    END
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_search_index_link_${spec.table} ON ${spec.table};
    CREATE TRIGGER trg_search_index_link_${spec.table}
    AFTER INSERT OR UPDATE OR DELETE ON ${spec.table}
    FOR EACH ROW
    EXECUTE FUNCTION search_index_sync_link_${spec.table}();
  `;
}

function refreshFunctionSql(spec: SearchIndexTypeSpec): string {
  const a = spec.alias;
  return `
    CREATE OR REPLACE FUNCTION search_index_refresh_${spec.type}(p_tenant uuid, p_ids uuid[] DEFAULT NULL)
    RETURNS void AS $fn$
      DELETE FROM search_index si_del
      WHERE si_del.tenant_id = p_tenant
        AND si_del.entity_type = '${spec.type}'
        AND (p_ids IS NULL OR si_del.entity_id = ANY(p_ids))
        AND NOT EXISTS (
          SELECT 1 FROM ${spec.table} src
          WHERE src.id = si_del.entity_id AND src.tenant_id = p_tenant
        );
      INSERT INTO search_index (
        tenant_id, entity_type, entity_id, ref_prefix, ref_number,
        label, summary, status, extra_json, search_vector, source_updated_at, indexed_at
      )
      SELECT ${a}.tenant_id,
             '${spec.type}',
             ${a}.id,
             ${spec.refPrefix},
             ${spec.refNumber},
             ${spec.label},
             ${spec.summary},
             ${spec.status},
             ${spec.extraJson},
             ${spec.vector},
             ${spec.updatedAt},
             now()
      FROM ${spec.table} ${a}
      ${spec.joins ?? ''}
      WHERE ${a}.tenant_id = p_tenant
        AND (p_ids IS NULL OR ${a}.id = ANY(p_ids))
      ON CONFLICT (tenant_id, entity_type, entity_id) DO UPDATE SET
        ref_prefix = EXCLUDED.ref_prefix,
        ref_number = EXCLUDED.ref_number,
        label = EXCLUDED.label,
        summary = EXCLUDED.summary,
        status = EXCLUDED.status,
        extra_json = EXCLUDED.extra_json,
        search_vector = EXCLUDED.search_vector,
        source_updated_at = EXCLUDED.source_updated_at,
        indexed_at = EXCLUDED.indexed_at;
    $fn$ LANGUAGE sql;
  `;
}

function syncTriggerSql(spec: SearchIndexTypeSpec): string {
  return `
    CREATE OR REPLACE FUNCTION search_index_sync_${spec.table}()
    RETURNS trigger AS $fn$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        PERFORM search_index_delete(OLD.tenant_id, '${spec.type}', OLD.id);
        RETURN OLD;
      END IF;
      PERFORM search_index_refresh_${spec.type}(NEW.tenant_id, ARRAY[NEW.id]);
      RETURN NEW;
    END
    $fn$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_search_index_${spec.table} ON ${spec.table};
    CREATE TRIGGER trg_search_index_${spec.table}
    AFTER INSERT OR UPDATE OR DELETE ON ${spec.table}
    FOR EACH ROW
    EXECUTE FUNCTION search_index_sync_${spec.table}();
  `;
}

export class AiSearchIndex1853000000000 implements MigrationInterface {
  name = 'AiSearchIndex1853000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    await queryRunner.query(`
      CREATE TABLE search_index (
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        ref_prefix text NULL,
        ref_number int NULL,
        label text NOT NULL,
        summary text NULL,
        status text NULL,
        extra_json jsonb NULL,
        search_vector tsvector NOT NULL,
        source_updated_at timestamptz NULL,
        indexed_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, entity_type, entity_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_search_index_vector ON search_index USING GIN (search_vector)`);
    await queryRunner.query(`CREATE INDEX idx_search_index_label_trgm ON search_index USING GIN (label gin_trgm_ops)`);
    await queryRunner.query(`CREATE INDEX idx_search_index_ref ON search_index (tenant_id, ref_number) WHERE ref_number IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_search_index_type ON search_index (tenant_id, entity_type)`);
    await queryRunner.query(`ALTER TABLE search_index ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE search_index FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY search_index_tenant_isolation ON search_index
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant())
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_index_tsv(p_weight "char", p_text text)
      RETURNS tsvector AS $fn$
        SELECT setweight(to_tsvector('kanap_fr', coalesce(p_text, '')), p_weight)
            || setweight(to_tsvector('kanap_en', coalesce(p_text, '')), p_weight)
      $fn$ LANGUAGE sql STABLE
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_index_delete(p_tenant uuid, p_type text, p_id uuid)
      RETURNS void AS $fn$
        DELETE FROM search_index
        WHERE tenant_id = p_tenant AND entity_type = p_type AND entity_id = p_id
      $fn$ LANGUAGE sql
    `);

    for (const spec of TYPE_SPECS) {
      await queryRunner.query(refreshFunctionSql(spec));
      await queryRunner.query(syncTriggerSql(spec));
    }
    for (const spec of LINK_SPECS) {
      await queryRunner.query(linkTriggerSql(spec));
    }

    // Backfill every tenant. set_config(..., true) is transaction-local, which
    // keeps the RLS WITH CHECK satisfied for each tenant in turn.
    await queryRunner.query(`
      DO $do$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);
          ${TYPE_SPECS.map((spec) => `PERFORM search_index_refresh_${spec.type}(t.id);`).join('\n          ')}
        END LOOP;
      END
      $do$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const spec of LINK_SPECS) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_search_index_link_${spec.table} ON ${spec.table}`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_sync_link_${spec.table}()`);
    }
    for (const spec of TYPE_SPECS) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS trg_search_index_${spec.table} ON ${spec.table}`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_sync_${spec.table}()`);
      await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_refresh_${spec.type}(uuid, uuid[])`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_delete(uuid, text, uuid)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_index_tsv("char", text)`);
    await queryRunner.query(`DROP TABLE IF EXISTS search_index`);
    // pg_trgm intentionally left installed.
  }
}
