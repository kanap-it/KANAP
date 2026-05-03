#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

const DEFAULTS = {
  baseUrl: 'http://localhost:8080',
  email: 'admin@example.com',
  password: 'KANAPLocalDev!2026',
};

const argv = process.argv.slice(2);
const options = {
  baseUrl: DEFAULTS.baseUrl,
  email: DEFAULTS.email,
  password: DEFAULTS.password,
  skipRelations: false,
};

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (arg === '--base-url') options.baseUrl = argv[++i] ?? options.baseUrl;
  else if (arg === '--email') options.email = argv[++i] ?? options.email;
  else if (arg === '--password') options.password = argv[++i] ?? options.password;
  else if (arg === '--skip-relations') options.skipRelations = true;
  else if (!arg.startsWith('--') && i === 0) options.baseUrl = arg;
  else if (!arg.startsWith('--') && i === 1) options.email = arg;
  else if (!arg.startsWith('--') && i === 2) options.password = arg;
  else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

options.baseUrl = options.baseUrl.replace(/\/$/, '');

let token = '';
let apiPrefix = '';

const info = (message) => console.log(`[INFO] ${message}`);
const ok = (message) => console.log(`[OK]   ${message}`);
const warn = (message) => console.warn(`[WARN] ${message}`);

function file(name) {
  return path.join(ROOT_DIR, name);
}

function normalizeValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parseCsv(content, delimiter = ';') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(field);
      if (row.some((v) => v.length > 0)) rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some((v) => v.length > 0)) rows.push(row);

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => normalizeValue(h));
  return rows.slice(1).map((values) => {
    const out = {};
    for (let i = 0; i < headers.length; i += 1) {
      out[headers[i]] = normalizeValue(values[i] ?? '');
    }
    return out;
  });
}

function readCsv(name) {
  return parseCsv(readFileSync(file(name), 'utf8'));
}

function splitList(value) {
  return normalizeValue(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function boolValue(value) {
  return ['true', '1', 'yes', 'y'].includes(normalizeValue(value).toLowerCase());
}

function lower(value) {
  return normalizeValue(value).toLowerCase();
}

async function request(method, route, body, { uploadPath } = {}) {
  const headers = {};
  const init = { method, headers };

  if (token) headers.Authorization = `Bearer ${token}`;

  if (uploadPath) {
    const bytes = readFileSync(uploadPath);
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'text/csv;charset=utf-8' }), path.basename(uploadPath));
    init.body = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const url = `${options.baseUrl}${apiPrefix}${route}`;
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = text;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const details = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
    throw new Error(`${method} ${apiPrefix}${route} failed (${response.status})\n${details}`);
  }

  return payload === '' ? null : payload;
}

async function login() {
  info(`Authenticating as ${options.email}`);
  const body = { email: options.email, password: options.password };
  const candidates = ['/auth/login', '/api/auth/login'];

  let lastError;
  for (const route of candidates) {
    const prefix = route.startsWith('/api/') ? '/api' : '';
    apiPrefix = prefix;
    try {
      const payload = await request('POST', route.slice(prefix.length), body);
      token = payload.access_token;
      if (!token) throw new Error('No access_token in login response');
      ok(`Authenticated using ${apiPrefix || '(direct API)'}`);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function apiGet(route) {
  return request('GET', route);
}

async function apiPost(route, body) {
  return request('POST', route, body);
}

async function apiPatch(route, body) {
  return request('PATCH', route, body);
}

async function apiPut(route, body) {
  return request('PUT', route, body);
}

async function uploadCsv(route, csvPath) {
  return request('POST', route, undefined, { uploadPath: csvPath });
}

function items(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function getAll(route) {
  return items(await apiGet(route));
}

function firstBy(list, predicate) {
  return list.find(predicate)?.id ?? '';
}

async function idByName(route, name, field = 'name') {
  const needle = normalizeValue(name);
  return firstBy(await getAll(route), (item) => normalizeValue(item[field]) === needle);
}

async function companyIdByName(name) {
  return idByName('/companies?limit=500', name);
}

async function departmentIdByName(name, companyName = '') {
  const depts = await getAll('/departments?limit=1000');
  if (!companyName) return firstBy(depts, (item) => item.name === name);
  const companyId = await companyIdByName(companyName);
  return firstBy(depts, (item) => item.name === name && item.company_id === companyId);
}

async function userIdByEmail(email) {
  const needle = lower(email);
  return firstBy(await getAll('/users?limit=1000'), (item) => lower(item.email) === needle);
}

async function appIdByName(name) {
  return idByName('/applications?limit=1000', name);
}

async function projectIdByName(name) {
  const list = await getAll('/portfolio/projects?limit=1000');
  const project = list.find((item) => item.name === name);
  return project?.id ?? project?.project_id ?? '';
}

async function spendIdByName(name) {
  return idByName('/spend-items?limit=1000', name, 'product_name');
}

async function capexIdByDescription(description) {
  return idByName('/capex-items?limit=500', description, 'description');
}

async function contractIdByName(name) {
  return idByName('/contracts?limit=500', name);
}

async function locationIdByCode(code) {
  return firstBy(await getAll('/locations?limit=500'), (item) => item.code === code);
}

async function interfaceIdByCode(code) {
  return firstBy(await getAll('/interfaces?limit=1000'), (item) => item.interface_id === code);
}

async function connectionIdByCode(code) {
  return firstBy(await getAll('/connections?limit=500'), (item) => item.connection_id === code);
}

async function portfolioTeamIdByName(name) {
  return idByName('/portfolio/teams', name);
}

async function appIdsFromNames(raw) {
  const ids = [];
  for (const name of splitList(raw)) {
    const id = await appIdByName(name);
    if (id) ids.push(id);
    else warn(`Application '${name}' not found while resolving app IDs`);
  }
  return [...new Set(ids)];
}

async function setupSettings() {
  info('Configuring base settings');
  await apiPatch('/currency/settings', {
    reportingCurrency: 'EUR',
    defaultSpendCurrency: 'EUR',
    defaultCapexCurrency: 'EUR',
    allowedCurrencies: ['EUR', 'USD'],
  });

  const current = await apiGet('/it-ops/settings');
  const mergeByCode = (existing, additions) => {
    const map = new Map((existing ?? []).map((item) => [item.code, item]));
    for (const item of additions) map.set(item.code, { ...map.get(item.code), ...item });
    return [...map.values()];
  };
  await apiPatch('/it-ops/settings', {
    serverKinds: mergeByCode(current.serverKinds, [
      { code: 'storage', label: 'Storage', is_physical: true },
      { code: 'network_switch', label: 'Network Switch', is_physical: true },
      { code: 'iot_gateway', label: 'IoT Gateway', is_physical: true },
      { code: 'edge_node', label: 'Edge Node', is_physical: false },
      { code: 'cloud_instance', label: 'Cloud Instance', is_physical: false },
      { code: 'cloud_database', label: 'Cloud Database', is_physical: false },
    ]),
    operatingSystems: mergeByCode(current.operatingSystems, [
      { code: 'vmware_esxi_8_0', label: 'VMware ESXi 8.0' },
      { code: 'suse_linux_enterprise_15', label: 'SUSE Linux Enterprise 15' },
      { code: 'fortios_7_4', label: 'FortiOS 7.4' },
      { code: 'cisco_meraki', label: 'Cisco Meraki' },
      { code: 'schneider_ecostruxure', label: 'Schneider EcoStruxure' },
      { code: 'amazon_linux_2023', label: 'Amazon Linux 2023' },
      { code: 'amazon_rds', label: 'Amazon RDS' },
    ]),
    domains: mergeByCode(current.domains, [
      { code: 'fromage-co-local', label: 'fromage-co.local', dns_suffix: 'fromage-co.local' },
      { code: 'kaasmeester-local', label: 'kaasmeester.local', dns_suffix: 'kaasmeester.local' },
      { code: 'formaggio-supremo-local', label: 'formaggio-supremo.local', dns_suffix: 'formaggio-supremo.local' },
    ]),
  });
  ok('Base settings configured');
}

async function ensureCoa(name, code, scope, countryIso = undefined) {
  const coas = await apiGet('/chart-of-accounts?limit=500');
  const existing = items(coas).find((coa) => coa.name === name);
  if (existing) return existing.id;
  await apiPost('/chart-of-accounts', {
    code,
    name,
    scope,
    ...(countryIso ? { country_iso: countryIso } : {}),
  });
  const refreshed = await apiGet('/chart-of-accounts?limit=500');
  const created = items(refreshed).find((coa) => coa.name === name);
  if (!created) throw new Error(`Failed to create CoA '${name}'`);
  return created.id;
}

async function importCsv(name, route) {
  info(`Importing ${name}`);
  const result = await uploadCsv(`${route}?dryRun=false`, file(name));
  if (result?.ok === false) throw new Error(`${name} import returned ok=false:\n${JSON.stringify(result, null, 2)}`);
  ok(`Imported ${name}`);
  return result;
}

async function importAccounts(coaId, name) {
  info(`Importing ${name} into CoA ${coaId}`);
  const result = await uploadCsv(`/chart-of-accounts/${coaId}/accounts/import?dryRun=false`, file(name));
  if (result?.ok === false) throw new Error(`${name} import returned ok=false:\n${JSON.stringify(result, null, 2)}`);
  ok(`Imported ${name}`);
}

async function assignCompanyCoa(companyName, coaId) {
  const companyId = await companyIdByName(companyName);
  if (!companyId) {
    warn(`Company '${companyName}' not found; skipping CoA assignment`);
    return;
  }
  await apiPatch(`/companies/${companyId}`, { coa_id: coaId });
}

async function setupCoas() {
  const ifrs = await ensureCoa('IFRS Group Chart', 'IFRS-GROUP', 'GLOBAL');
  const fr = await ensureCoa('France PCG', 'FR-PCG', 'COUNTRY', 'FR');
  const nl = await ensureCoa('Netherlands RGS', 'NL-RGS', 'COUNTRY', 'NL');
  const it = await ensureCoa('Italy PDC', 'IT-PDC', 'COUNTRY', 'IT');
  const us = await ensureCoa('US GAAP', 'US-GAAP', 'COUNTRY', 'US');

  await importAccounts(ifrs, '02-accounts-ifrs.csv');
  await importAccounts(fr, '03-accounts-fr.csv');
  await importAccounts(nl, '04-accounts-nl.csv');
  await importAccounts(it, '05-accounts-it.csv');
  await importAccounts(us, '06-accounts-us.csv');

  await assignCompanyCoa('Fromage & Co SA', fr);
  await assignCompanyCoa('Kaasmeester BV', nl);
  await assignCompanyCoa('Formaggio Supremo SRL', it);
  await assignCompanyCoa('Fromage & Co Inc.', us);
  ok('CoA setup complete');
}

async function upsertLocation(code, name, extra) {
  const existingId = await locationIdByCode(code);
  const body = { ...extra, code, name };
  if (existingId) {
    await apiPatch(`/locations/${existingId}`, body);
    ok(`Updated location ${code}`);
  } else {
    await apiPost('/locations', body);
    ok(`Created location ${code}`);
  }
}

async function ensureLocations() {
  info('Ensuring locations');
  const fr = await companyIdByName('Fromage & Co SA');
  const nl = await companyIdByName('Kaasmeester BV');
  const it = await companyIdByName('Formaggio Supremo SRL');
  const us = await companyIdByName('Fromage & Co Inc.');
  await upsertLocation('PAR-DC1', 'Paris Data Center', { hosting_type: 'on_prem', operating_company_id: fr, country_iso: 'FR', city: 'Paris', datacenter: 'Main DC' });
  await upsertLocation('GOU-DC1', 'Gouda Server Room', { hosting_type: 'on_prem', operating_company_id: nl, country_iso: 'NL', city: 'Gouda', datacenter: 'Single rack' });
  await upsertLocation('PRM-SITE', 'Parma Server Room', { hosting_type: 'on_prem', operating_company_id: it, country_iso: 'IT', city: 'Parma', datacenter: 'Single rack' });
  await upsertLocation('PAR-CAVE', 'Paris Cheese Caves', { hosting_type: 'on_prem', operating_company_id: fr, country_iso: 'FR', city: 'Paris', datacenter: 'Production site' });
  await upsertLocation('NYC-OFF', 'New York Office', { hosting_type: 'on_prem', operating_company_id: us, country_iso: 'US', city: 'New York', datacenter: 'Office' });
  await upsertLocation('AWS-EU', 'AWS eu-west-1', { hosting_type: 'public_cloud', provider: 'aws', country_iso: 'IE', city: 'Dublin', region: 'eu-west-1', additional_info: 'AWS Ireland region' });
}

async function ensureConnectionEntities() {
  const current = await apiGet('/it-ops/settings');
  const entities = new Map((current.entities ?? []).map((entity) => [entity.code, entity]));
  for (const entity of [
    { code: 'par_dc1', label: 'PAR-DC1' },
    { code: 'gou_dc1', label: 'GOU-DC1' },
    { code: 'prm_site', label: 'PRM-SITE' },
    { code: 'nyc_off', label: 'NYC-OFF' },
    { code: 'aws_eu', label: 'AWS-EU' },
  ]) {
    entities.set(entity.code, { ...entities.get(entity.code), ...entity });
  }
  await apiPatch('/it-ops/settings', { entities: [...entities.values()] });
  ok('Connection entities ensured');
}

async function ensureAppInstances() {
  info('Ensuring app instances');
  for (const row of readCsv('20-app-instances.csv')) {
    const appId = await appIdByName(row.application_name);
    if (!appId) {
      warn(`Skipping app instance for missing app '${row.application_name}'`);
      continue;
    }
    const existing = items(await apiGet(`/applications/${appId}/instances`))
      .find((instance) => instance.environment === row.environment);
    const body = {
      environment: row.environment,
      lifecycle: lower(row.lifecycle) || 'active',
      region: row.region || null,
      zone: row.zone || null,
      base_url: row.base_url || null,
      sso_enabled: boolValue(row.sso_enabled),
      mfa_supported: boolValue(row.mfa_supported),
      notes: row.notes || null,
    };
    if (existing) await apiPatch(`/app-instances/${existing.id}`, body);
    else await apiPost(`/applications/${appId}/instances`, body);
  }
  ok('App instances ensured');
}

async function ensureMiddlewareEtlEnabled() {
  const names = new Set();
  for (const row of readCsv('21-interfaces.csv')) {
    if (lower(row.integration_route_type) === 'via_middleware') {
      for (const name of splitList(row.middleware_application_names)) names.add(name);
    }
  }
  for (const name of names) {
    const id = await appIdByName(name);
    if (!id) warn(`Middleware app '${name}' not found; cannot set etl_enabled`);
    else await apiPatch(`/applications/${id}`, { etl_enabled: true });
  }
}

async function ensureInterfaces() {
  info('Ensuring interfaces');
  for (const row of readCsv('21-interfaces.csv')) {
    const sourceId = await appIdByName(row.source_application_name);
    const targetId = await appIdByName(row.target_application_name);
    if (!sourceId || !targetId) {
      warn(`Skipping interface '${row.interface_id}' because source or target app is missing`);
      continue;
    }
    const body = {
      interface_id: row.interface_id,
      name: row.name,
      business_purpose: row.business_purpose,
      source_application_id: sourceId,
      target_application_id: targetId,
      data_category: lower(row.data_category),
      integration_route_type: lower(row.integration_route_type),
      data_class: lower(row.data_class),
      contains_pii: boolValue(row.contains_pii),
      lifecycle: lower(row.lifecycle),
      middleware_application_ids: await appIdsFromNames(row.middleware_application_names),
    };
    const existingId = await interfaceIdByCode(row.interface_id);
    if (existingId) await apiPatch(`/interfaces/${existingId}`, body);
    else await apiPost('/interfaces', body);
  }
  ok('Interfaces ensured');
}

async function ensureConnections() {
  info('Ensuring connections');
  for (const row of readCsv('23-connections.csv')) {
    const body = {
      connection_id: row.connection_id,
      name: row.name,
      purpose: row.purpose || null,
      topology: lower(row.topology) || 'server_to_server',
      source_entity_code: lower(row.source_entity_code),
      destination_entity_code: lower(row.destination_entity_code),
      protocol_codes: splitList(row.protocol_codes).map(lower),
      lifecycle: lower(row.lifecycle) || 'active',
      criticality: lower(row.criticality) || 'medium',
      data_class: lower(row.data_class) || 'internal',
      contains_pii: boolValue(row.contains_pii),
      notes: row.notes || null,
    };
    const existingId = await connectionIdByCode(row.connection_id);
    if (existingId) await apiPatch(`/connections/${existingId}`, body);
    else await apiPost('/connections', body);
  }
  ok('Connections ensured');
}

async function ensureConnectionLegs() {
  info('Ensuring connection legs');
  const rowsByConnection = new Map();
  for (const row of readCsv('24-connection-legs.csv')) {
    const list = rowsByConnection.get(row.connection_id) ?? [];
    list.push(row);
    rowsByConnection.set(row.connection_id, list);
  }
  for (const [connectionCode, rows] of rowsByConnection) {
    const connectionId = await connectionIdByCode(connectionCode);
    if (!connectionId) {
      warn(`Skipping legs for missing connection '${connectionCode}'`);
      continue;
    }
    const legs = rows.map((row) => ({
      order_index: Number(row.order_index || 1),
      layer_type: lower(row.layer_type),
      source_entity_code: lower(row.source_entity_code),
      destination_entity_code: lower(row.destination_entity_code),
      protocol_codes: splitList(row.protocol_codes).map(lower),
      port_override: row.port_override || null,
      notes: row.notes || null,
    }));
    await apiPut(`/connections/${connectionId}/legs`, legs);
  }
  ok('Connection legs ensured');
}

async function ensureInterfaceBindings() {
  info('Ensuring interface bindings');
  for (const row of readCsv('22-interface-bindings.csv')) {
    const interfaceId = await interfaceIdByCode(row.interface_id);
    if (!interfaceId) {
      warn(`Skipping binding for missing interface '${row.interface_id}'`);
      continue;
    }
    const sourceInstanceId = await instanceIdByAppEnv(row.source_application_name, row.environment);
    const targetInstanceId = await instanceIdByAppEnv(row.target_application_name, row.environment);
    if (!sourceInstanceId || !targetInstanceId) {
      warn(`Skipping binding for missing instance '${row.source_application_name}' -> '${row.target_application_name}'/${row.environment}`);
      continue;
    }
    const legs = items(await apiGet(`/interfaces/${interfaceId}/legs`));
    const leg = legs.find((item) => Number(item.order_index ?? 1) === Number(row.leg_order || 1));
    if (!leg) {
      warn(`Skipping binding for '${row.interface_id}' because leg ${row.leg_order || 1} is missing`);
      continue;
    }
    const bindings = items(await apiGet(`/interfaces/${interfaceId}/bindings`));
    const existing = bindings.find((item) => item.interface_leg_id === leg.id && item.environment === row.environment);
    const integrationToolId = row.integration_tool_application_name
      ? await appIdByName(row.integration_tool_application_name)
      : '';
    const body = {
      interface_leg_id: leg?.id ?? null,
      source_instance_id: sourceInstanceId,
      target_instance_id: targetInstanceId,
      source_endpoint: row.source_endpoint || null,
      target_endpoint: row.target_endpoint || null,
      trigger_details: row.trigger_details || null,
      env_job_name: row.env_job_name || null,
      authentication_mode: lower(row.authentication_mode) || null,
      monitoring_url: row.monitoring_url || null,
      env_notes: row.env_notes || null,
      status: lower(row.status) || 'active',
      integration_tool_application_id: integrationToolId || null,
    };
    if (existing) await apiPatch(`/interface-bindings/${existing.id}`, body);
    else await apiPost(`/interfaces/${interfaceId}/bindings`, body);
  }
  ok('Interface bindings ensured');
}

async function ensureInterfaceConnectionLinks() {
  info('Ensuring interface connection links');
  for (const row of readCsv('25-interface-connection-links.csv')) {
    const interfaceId = await interfaceIdByCode(row.interface_id);
    const connectionId = await connectionIdByCode(row.connection_id);
    if (!interfaceId || !connectionId) {
      warn(`Skipping interface/connection link '${row.interface_id}' -> '${row.connection_id}'`);
      continue;
    }
    const bindings = items(await apiGet(`/interfaces/${interfaceId}/bindings`));
    const legs = items(await apiGet(`/interfaces/${interfaceId}/legs`));
    const leg = legs.find((item) => Number(item.order_index ?? 1) === Number(row.leg_order || 1));
    const binding = bindings.find((item) => item.environment === row.environment && item.interface_leg_id === leg?.id);
    if (!binding) {
      warn(`Skipping connection link for '${row.interface_id}' (${row.environment}); binding missing`);
      continue;
    }
    await apiPost(`/interface-bindings/${binding.id}/connection-links`, {
      connection_id: connectionId,
      role: lower(row.role) || null,
      notes: row.notes || null,
    });
  }
  ok('Interface connection links ensured');
}

async function instanceIdByAppEnv(appName, environment) {
  const appId = await appIdByName(appName);
  if (!appId) return '';
  return firstBy(items(await apiGet(`/applications/${appId}/instances`)), (item) => item.environment === environment);
}

async function linkSuites() {
  for (const [suiteName, componentNames] of [
    ['Microsoft 365', ['Exchange Online', 'SharePoint Online', 'Teams']],
    ['SAP S/4HANA', ['SAP FI/CO', 'SAP MM', 'SAP SD']],
    ['Salesforce', ['Sales Cloud', 'Service Cloud']],
  ]) {
    const suiteId = await appIdByName(suiteName);
    if (!suiteId) continue;
    for (const componentName of componentNames) {
      const componentId = await appIdByName(componentName);
      if (componentId) await apiPost(`/applications/${componentId}/suites/bulk-replace`, { suite_ids: [suiteId] });
    }
  }
}

async function linkApplicationDepartments() {
  for (const row of readCsv('12-applications.csv')) {
    const appId = await appIdByName(row.name);
    if (!appId || !row.department_names) continue;
    const ids = [];
    for (const name of splitList(row.department_names)) {
      const id = await departmentIdByName(name);
      if (id) ids.push(id);
    }
    if (ids.length) await apiPost(`/applications/${appId}/departments/bulk-replace`, { department_ids: [...new Set(ids)] });
  }
}

async function linkContractsToApps() {
  for (const row of readCsv('13-contracts.csv')) {
    const contractId = await contractIdByName(row.name);
    const appIds = await appIdsFromNames(row.application_names);
    if (contractId && appIds.length) {
      await apiPost(`/contracts/${contractId}/applications/bulk-replace`, { application_ids: appIds });
    }
  }
}

async function linkSpendToApps() {
  for (const row of readCsv('14-spend-items.csv')) {
    const spendId = await spendIdByName(row.product_name);
    const appIds = await appIdsFromNames(row.application_names);
    if (spendId && appIds.length) {
      await apiPost(`/spend-items/${spendId}/applications/bulk-replace`, { application_ids: appIds });
    }
  }
}

async function ensurePortfolioTeamsAndCapacity() {
  for (const name of ['Business Applications', 'Development', 'Infrastructure']) {
    await ensurePortfolioTeam(name);
  }
  const teamByEmail = [
    ['sophie.laurent@fromage-co.com', 'Business Applications'],
    ['marc.petit@fromage-co.com', 'Development'],
    ['pierre.martin@fromage-co.com', 'Infrastructure'],
    ['lucas.bernard@fromage-co.com', 'Infrastructure'],
    ['clara.dupont@fromage-co.com', 'Business Applications'],
  ];
  for (const [email, team] of teamByEmail) {
    const userId = await userIdByEmail(email);
    const teamId = await portfolioTeamIdByName(team);
    if (userId && teamId) {
      await apiPost(`/portfolio/team-members/by-user/${userId}`, {
        team_id: teamId,
        project_availability: 10,
      });
    }
  }
}

async function ensurePortfolioTeam(name) {
  const existingId = await portfolioTeamIdByName(name);
  const body = { name, description: `${name} delivery team`, status: 'enabled' };
  if (existingId) await apiPatch(`/portfolio/teams/${existingId}`, body);
  else await apiPost('/portfolio/teams', body);
}

async function runImports() {
  await importCsv('01-companies.csv', '/companies/import');
  await setupCoas();
  await importCsv('07-suppliers.csv', '/suppliers/import');
  await importCsv('08-departments.csv', '/departments/import');
  await importCsv('09-contacts.csv', '/contacts/import');
  await importCsv('10-users.csv', '/users/import');
  await importCsv('11-business-processes.csv', '/business-processes/import');
  await importCsv('12-applications.csv', '/applications/import');
  await importCsv('13-contracts.csv', '/contracts/import');
  await importCsv('14-spend-items.csv', '/spend-items/import');
  await importCsv('15-capex-items.csv', '/capex-items/import');
  await importCsv('16-portfolio-projects.csv', '/portfolio/projects/import');
  await importCsv('17-portfolio-requests.csv', '/portfolio/requests/import');
  await ensureLocations();
  await importCsv('18-assets.csv', '/assets/import');
  await importCsv('19-tasks.csv', '/tasks/import');
}

async function runRelations() {
  await ensureConnectionEntities();
  await linkSuites();
  await linkApplicationDepartments();
  await ensureAppInstances();
  await ensureMiddlewareEtlEnabled();
  await ensureInterfaces();
  await ensureConnections();
  await ensureConnectionLegs();
  await ensureInterfaceBindings();
  await ensureInterfaceConnectionLinks();
  await linkContractsToApps();
  await linkSpendToApps();
  await ensurePortfolioTeamsAndCapacity();
}

async function main() {
  await login();
  await setupSettings();
  await runImports();
  if (!options.skipRelations) await runRelations();
  ok('Fromage & Co fixture setup complete');
}

main().catch((error) => {
  console.error(`[ERR]  ${error.message}`);
  process.exitCode = 1;
});
