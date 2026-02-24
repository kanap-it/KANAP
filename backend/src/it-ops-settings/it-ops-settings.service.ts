import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Location } from '../locations/location.entity';

export type ItOpsEnumOption = {
  code: string;
  label: string;
  deprecated?: boolean;
  category?: string;
};

export type OperatingSystemOption = ItOpsEnumOption & {
  standardSupportEnd?: string; // YYYY-MM-DD
  extendedSupportEnd?: string; // YYYY-MM-DD
};

export type ConnectionTypeOption = ItOpsEnumOption & {
  typicalPorts?: string;
};

export type AssetKindOption = ItOpsEnumOption & {
  is_physical?: boolean;
};

export type GraphTier = 'top' | 'upper' | 'center' | 'lower' | 'bottom';

export type ServerRoleOption = ItOpsEnumOption & {
  graph_tier?: GraphTier;
};

export type EntityOption = ItOpsEnumOption & {
  graph_tier?: GraphTier;
};

export type DomainOption = {
  code: string;
  label: string;
  dns_suffix: string;
  deprecated?: boolean;
  system?: boolean;
};

export type SubnetOption = {
  location_id: string;    // Mandatory, references locations table
  cidr: string;           // e.g., "192.168.1.0/24" (mandatory)
  vlan_number?: number;   // Optional VLAN ID (1-4094)
  network_zone: string;   // Mandatory, references networkSegments code
  description?: string;   // Optional one-line description
  deprecated?: boolean;
};

export type ItOpsSettings = {
  applicationCategories: ItOpsEnumOption[];
  dataClasses: ItOpsEnumOption[];
  networkSegments: ItOpsEnumOption[];
  entities: EntityOption[];
  serverKinds: AssetKindOption[];
  serverProviders: ItOpsEnumOption[];
  serverRoles: ServerRoleOption[];
  hostingTypes: ItOpsEnumOption[];
  lifecycleStates: ItOpsEnumOption[];
  interfaceProtocols: ItOpsEnumOption[];
  interfaceDataCategories: ItOpsEnumOption[];
  interfaceTriggerTypes: ItOpsEnumOption[];
  interfacePatterns: ItOpsEnumOption[];
  interfaceFormats: ItOpsEnumOption[];
  interfaceAuthModes: ItOpsEnumOption[];
  operatingSystems: OperatingSystemOption[];
  connectionTypes: ConnectionTypeOption[];
  subnets: SubnetOption[];
  domains: DomainOption[];
  ipAddressTypes: ItOpsEnumOption[];
  accessMethods: ItOpsEnumOption[];
};

type ItOpsMetadataShape = {
  application_categories?: ItOpsEnumOption[];
  data_classes?: ItOpsEnumOption[];
  network_segments?: ItOpsEnumOption[];
  entities?: EntityOption[];
  server_kinds?: ItOpsEnumOption[];
  server_providers?: ItOpsEnumOption[];
  server_roles?: ServerRoleOption[];
  hosting_types?: ItOpsEnumOption[];
  lifecycle_states?: ItOpsEnumOption[];
  interface_protocols?: ItOpsEnumOption[];
  interface_data_categories?: ItOpsEnumOption[];
  interface_trigger_types?: ItOpsEnumOption[];
  interface_patterns?: ItOpsEnumOption[];
  interface_formats?: ItOpsEnumOption[];
  interface_auth_modes?: ItOpsEnumOption[];
  operating_systems?: OperatingSystemOption[];
  connection_types?: ConnectionTypeOption[];
  subnets?: SubnetOption[];
  domains?: DomainOption[];
  ip_address_types?: ItOpsEnumOption[];
  access_methods?: ItOpsEnumOption[];
};

@Injectable()
export class ItOpsSettingsService {
  private readonly lockedLifecycleStates: ItOpsEnumOption[] = [
    { code: 'proposed', label: 'Proposed' },
    { code: 'active', label: 'Active' },
    { code: 'deprecated', label: 'Deprecated' },
    { code: 'retired', label: 'Retired' },
  ];

  private readonly lockedLifecycleCodes = new Set(this.lockedLifecycleStates.map((item) => item.code));

  private readonly defaultLifecycleStates: ItOpsEnumOption[] = [...this.lockedLifecycleStates];

  private readonly defaultApplicationCategories: ItOpsEnumOption[] = [
    { code: 'line_of_business', label: 'Line-of-business' },
    { code: 'productivity', label: 'Productivity' },
    { code: 'security', label: 'Security' },
    { code: 'analytics', label: 'Analytics' },
    { code: 'development', label: 'Development' },
    { code: 'integration', label: 'Integration' },
    { code: 'infrastructure', label: 'Infrastructure' },
  ];

  private readonly defaultDataClasses: ItOpsEnumOption[] = [
    { code: 'public', label: 'Public' },
    { code: 'internal', label: 'Internal' },
    { code: 'confidential', label: 'Confidential' },
    { code: 'restricted', label: 'Restricted' },
  ];

  private readonly defaultNetworkSegments: ItOpsEnumOption[] = [
    { code: 'lan', label: 'LAN' },
    { code: 'dmz', label: 'DMZ' },
    { code: 'industrial_lan', label: 'Industrial LAN' },
    { code: 'wifi', label: 'WiFi' },
    { code: 'public_cloud', label: 'Public Cloud' },
    { code: 'guest', label: 'Guest' },
    { code: 'management', label: 'Management' },
    { code: 'storage', label: 'Storage' },
    { code: 'vpn', label: 'VPN' },
  ];

  private readonly defaultEntities: EntityOption[] = [
    { code: 'internal_users', label: 'Internal Users', graph_tier: 'top' },
    { code: 'external_users', label: 'External Users', graph_tier: 'top' },
    { code: 'internet', label: 'Internet', graph_tier: 'top' },
    { code: 'customers', label: 'Customers', graph_tier: 'top' },
    { code: 'partner_networks', label: 'Partner Networks', graph_tier: 'top' },
  ];

  private readonly defaultServerKinds: AssetKindOption[] = [
    // Existing types
    { code: 'physical_server', label: 'Physical Server', is_physical: true },
    { code: 'virtual_machine', label: 'Virtual Machine', is_physical: false },
    { code: 'container', label: 'Container', is_physical: false },
    { code: 'serverless', label: 'Serverless', is_physical: false },
    { code: 'appliance', label: 'Appliance', is_physical: true },
    { code: 'saas', label: 'SaaS', is_physical: false },
    { code: 'other', label: 'Other', is_physical: false },
    // New asset types
    { code: 'switch', label: 'Switch', is_physical: true },
    { code: 'firewall', label: 'Firewall', is_physical: true },
    { code: 'load_balancer', label: 'Load Balancer', is_physical: true },
    { code: 'access_point', label: 'Access Point', is_physical: true },
    { code: 'san', label: 'SAN', is_physical: true },
    { code: 'nas', label: 'NAS', is_physical: true },
    { code: 'backup_appliance', label: 'Backup Appliance', is_physical: true },
    { code: 'tape_library', label: 'Tape Library', is_physical: true },
    { code: 'industrial_robot', label: 'Industrial Robot', is_physical: true },
    { code: 'industrial_machine', label: 'Industrial Machine', is_physical: true },
    { code: 'rack', label: 'Rack', is_physical: true },
  ];

  private readonly defaultServerProviders: ItOpsEnumOption[] = [
    { code: 'aws', label: 'AWS' },
    { code: 'azure', label: 'Azure' },
    { code: 'gcp', label: 'GCP' },
    { code: 'other', label: 'Other' },
  ];

  private readonly defaultServerRoles: ServerRoleOption[] = [
    { code: 'app', label: 'Application server', graph_tier: 'upper' },
    { code: 'backup', label: 'Backup server', graph_tier: 'lower' },
    { code: 'cloud-service', label: 'Cloud service', graph_tier: 'upper' },
    { code: 'db', label: 'Database server', graph_tier: 'bottom' },
    { code: 'domain-controller', label: 'Domain controller', graph_tier: 'lower' },
    { code: 'file', label: 'File server', graph_tier: 'center' },
    { code: 'mail', label: 'Mail / messaging', graph_tier: 'center' },
    { code: 'monitoring', label: 'Monitoring server', graph_tier: 'center' },
    { code: 'other', label: 'Other', graph_tier: 'center' },
    { code: 'print', label: 'Print server', graph_tier: 'center' },
    { code: 'proxy', label: 'Proxy / gateway', graph_tier: 'top' },
    { code: 'remote-desktop', label: 'Remote desktop', graph_tier: 'center' },
    { code: 'virtualization', label: 'Virtualization host', graph_tier: 'lower' },
    { code: 'web', label: 'Web server', graph_tier: 'top' },
  ];

  private readonly defaultHostingTypes: ItOpsEnumOption[] = [
    { code: 'on_prem', label: 'On-prem', category: 'on_prem' },
    { code: 'colocation', label: 'Colocation', category: 'on_prem' },
    { code: 'public_cloud', label: 'Public Cloud', category: 'cloud' },
    { code: 'private_cloud', label: 'Private Cloud', category: 'cloud' },
    { code: 'saas', label: 'SaaS', category: 'cloud' },
  ];

  private readonly defaultInterfaceProtocols: ItOpsEnumOption[] = [
    { code: 'http', label: 'HTTP' },
    { code: 'https', label: 'HTTPS' },
    { code: 'ftp', label: 'FTP' },
    { code: 'sftp', label: 'SFTP' },
    { code: 'smb', label: 'SMB / Windows share' },
    { code: 'smtp', label: 'SMTP' },
    { code: 'jdbc', label: 'JDBC' },
    { code: 'odbc', label: 'ODBC' },
    { code: 'amqp', label: 'AMQP / MQ' },
    { code: 'ssh', label: 'SSH' },
    { code: 'other', label: 'Other' },
  ];

  private readonly defaultInterfaceDataCategories: ItOpsEnumOption[] = [
    { code: 'master_data', label: 'Master Data' },
    { code: 'transactional', label: 'Transactional' },
    { code: 'reporting', label: 'Reporting' },
    { code: 'control', label: 'Control' },
  ];

  private readonly defaultInterfaceTriggerTypes: ItOpsEnumOption[] = [
    { code: 'event_based', label: 'Event-based' },
    { code: 'scheduled', label: 'Scheduled' },
    { code: 'on_demand', label: 'On-demand' },
    { code: 'real_time', label: 'Real-time' },
  ];

  private readonly defaultInterfacePatterns: ItOpsEnumOption[] = [
    { code: 'rest_api_sync', label: 'REST API (sync)' },
    { code: 'rest_api_async', label: 'REST API (async / callback)' },
    { code: 'soap_webservice', label: 'SOAP web service' },
    { code: 'file_transfer_batch', label: 'File transfer (batch)' },
    { code: 'message_queue', label: 'Message queue (point-to-point)' },
    { code: 'pub_sub_topic', label: 'Pub/Sub (topic)' },
    { code: 'etl_batch', label: 'ETL batch job' },
    { code: 'db_link_view', label: 'DB link / direct DB read' },
    { code: 'scheduled_job', label: 'Scheduled script / job' },
    { code: 'webhook', label: 'Webhook' },
    { code: 'manual_import_export', label: 'Manual import / export' },
    { code: 'other', label: 'Other' },
  ];

  private readonly defaultInterfaceFormats: ItOpsEnumOption[] = [
    { code: 'csv', label: 'CSV' },
    { code: 'delimited', label: 'Delimited text' },
    { code: 'fixed_width', label: 'Fixed-width text' },
    { code: 'xml', label: 'XML' },
    { code: 'json', label: 'JSON' },
    { code: 'txt_plain', label: 'Plain text' },
    { code: 'xlsx', label: 'Excel (XLSX)' },
    { code: 'pdf', label: 'PDF' },
    { code: 'sap_idoc', label: 'SAP IDoc' },
    { code: 'edi_edifact', label: 'EDI EDIFACT' },
    { code: 'binary_custom', label: 'Binary (custom)' },
    { code: 'other', label: 'Other' },
  ];

  private readonly defaultInterfaceAuthModes: ItOpsEnumOption[] = [
    { code: 'service_account', label: 'Service account' },
    { code: 'oauth2', label: 'OAuth2' },
    { code: 'api_key', label: 'API key' },
    { code: 'certificate', label: 'Certificate' },
    { code: 'none', label: 'None' },
  ];

  private readonly defaultOperatingSystems: OperatingSystemOption[] = [
    { code: 'windows_server_2012_r2', label: 'Windows Server 2012 R2', standardSupportEnd: '2018-10-09', extendedSupportEnd: '2023-10-10' },
    { code: 'windows_server_2016', label: 'Windows Server 2016', standardSupportEnd: '2022-01-11', extendedSupportEnd: '2027-01-12' },
    { code: 'windows_server_2019', label: 'Windows Server 2019', standardSupportEnd: '2024-01-09', extendedSupportEnd: '2029-01-09' },
    { code: 'windows_server_2022', label: 'Windows Server 2022', standardSupportEnd: '2026-10-13', extendedSupportEnd: '2031-10-14' },
    { code: 'windows_server_2025', label: 'Windows Server 2025', standardSupportEnd: '2029-11-13', extendedSupportEnd: '2034-11-14' },
    { code: 'ubuntu_18_04_lts', label: 'Ubuntu 18.04 LTS', standardSupportEnd: '2023-05-31', extendedSupportEnd: '2028-04-30' },
    { code: 'ubuntu_20_04_lts', label: 'Ubuntu 20.04 LTS', standardSupportEnd: '2025-05-31', extendedSupportEnd: '2030-05-31' },
    { code: 'ubuntu_22_04_lts', label: 'Ubuntu 22.04 LTS', standardSupportEnd: '2027-04-30', extendedSupportEnd: '2032-04-30' },
    { code: 'ubuntu_24_04_lts', label: 'Ubuntu 24.04 LTS', standardSupportEnd: '2029-04-30', extendedSupportEnd: '2034-04-30' },
    { code: 'rhel_7', label: 'RHEL 7', standardSupportEnd: '2024-06-30', extendedSupportEnd: '2029-05-31' },
    { code: 'rhel_8', label: 'RHEL 8', standardSupportEnd: '2024-05-31', extendedSupportEnd: '2029-05-31' },
    { code: 'rhel_9', label: 'RHEL 9', standardSupportEnd: '2027-05-31', extendedSupportEnd: '2032-05-31' },
    { code: 'debian_10_buster', label: 'Debian 10 (Buster)', standardSupportEnd: '2022-09-10', extendedSupportEnd: '2024-06-30' },
    { code: 'debian_11_bullseye', label: 'Debian 11 (Bullseye)', standardSupportEnd: '2024-07-01', extendedSupportEnd: '2026-06-30' },
    { code: 'debian_12_bookworm', label: 'Debian 12 (Bookworm)', standardSupportEnd: '2026-06-10', extendedSupportEnd: '2028-06-30' },
    { code: 'sles_12_sp5', label: 'SLES 12 SP5', standardSupportEnd: '2024-10-31', extendedSupportEnd: '2027-10-31' },
    { code: 'sles_15_sp5', label: 'SLES 15 SP5', standardSupportEnd: '2025-12-31', extendedSupportEnd: '2028-12-31' },
    { code: 'sles_15_sp6', label: 'SLES 15 SP6', standardSupportEnd: '2028-12-31', extendedSupportEnd: '2031-12-31' },
    { code: 'sles_15_sp7', label: 'SLES 15 SP7', standardSupportEnd: '2031-07-31', extendedSupportEnd: '2034-06-30' },
  ];

  private readonly defaultConnectionTypes: ConnectionTypeOption[] = [
    { category: 'Application', label: 'HTTP', code: 'http', typicalPorts: '80' },
    { category: 'Application', label: 'HTTPS', code: 'https', typicalPorts: '443' },
    { category: 'Application', label: 'WebSocket', code: 'ws', typicalPorts: '80, 443' },
    { category: 'Application', label: 'REST API', code: 'rest', typicalPorts: '80, 443' },
    { category: 'Application', label: 'SOAP', code: 'soap', typicalPorts: '80, 443' },
    { category: 'Database', label: 'SQL Server (TDS)', code: 'mssql', typicalPorts: '1433' },
    { category: 'Database', label: 'Oracle Net', code: 'oracle', typicalPorts: '1521' },
    { category: 'Database', label: 'MySQL', code: 'mysql', typicalPorts: '3306' },
    { category: 'Database', label: 'PostgreSQL', code: 'pgsql', typicalPorts: '5432' },
    { category: 'Database', label: 'MongoDB', code: 'mongodb', typicalPorts: '27017' },
    { category: 'Database', label: 'Redis', code: 'redis', typicalPorts: '6379' },
    { category: 'Authentication', label: 'LDAP', code: 'ldap', typicalPorts: '389' },
    { category: 'Authentication', label: 'LDAPS', code: 'ldaps', typicalPorts: '636' },
    { category: 'Authentication', label: 'Kerberos', code: 'kerberos', typicalPorts: '88' },
    { category: 'Authentication', label: 'RADIUS', code: 'radius', typicalPorts: '1812, 1813' },
    { category: 'Authentication', label: 'TACACS+', code: 'tacacs', typicalPorts: '49' },
    { category: 'Remote Access', label: 'SSH', code: 'ssh', typicalPorts: '22' },
    { category: 'Remote Access', label: 'RDP', code: 'rdp', typicalPorts: '3389' },
    { category: 'Remote Access', label: 'VNC', code: 'vnc', typicalPorts: '5900+' },
    { category: 'Remote Access', label: 'WinRM', code: 'winrm', typicalPorts: '5985, 5986' },
    { category: 'Remote Access', label: 'Telnet', code: 'telnet', typicalPorts: '23' },
    { category: 'File Transfer', label: 'SFTP', code: 'sftp', typicalPorts: '22' },
    { category: 'File Transfer', label: 'SCP', code: 'scp', typicalPorts: '22' },
    { category: 'File Transfer', label: 'FTP', code: 'ftp', typicalPorts: '21' },
    { category: 'File Transfer', label: 'FTPS', code: 'ftps', typicalPorts: '990' },
    { category: 'File Transfer', label: 'TFTP', code: 'tftp', typicalPorts: '69' },
    { category: 'File Sharing', label: 'SMB / CIFS', code: 'smb', typicalPorts: '445' },
    { category: 'File Sharing', label: 'NFS', code: 'nfs', typicalPorts: '2049' },
    { category: 'File Sharing', label: 'DFS', code: 'dfs', typicalPorts: '445' },
    { category: 'Storage', label: 'iSCSI', code: 'iscsi', typicalPorts: '3260' },
    { category: 'Storage', label: 'NDMP', code: 'ndmp', typicalPorts: '10000' },
    { category: 'Messaging', label: 'AMQP', code: 'amqp', typicalPorts: '5672' },
    { category: 'Messaging', label: 'MQTT', code: 'mqtt', typicalPorts: '1883, 8883' },
    { category: 'Messaging', label: 'Kafka', code: 'kafka', typicalPorts: '9092' },
    { category: 'Messaging', label: 'RabbitMQ', code: 'rabbitmq', typicalPorts: '5672' },
    { category: 'Email', label: 'SMTP', code: 'smtp', typicalPorts: '25, 587' },
    { category: 'Email', label: 'IMAP', code: 'imap', typicalPorts: '143, 993' },
    { category: 'Email', label: 'POP3', code: 'pop3', typicalPorts: '110, 995' },
    { category: 'Monitoring', label: 'SNMP', code: 'snmp', typicalPorts: '161, 162' },
    { category: 'Monitoring', label: 'Syslog', code: 'syslog', typicalPorts: '514' },
    { category: 'Monitoring', label: 'WMI', code: 'wmi', typicalPorts: '135 + dynamic' },
    { category: 'Monitoring', label: 'IPMI', code: 'ipmi', typicalPorts: '623' },
    { category: 'Monitoring', label: 'Zabbix Agent', code: 'zabbix', typicalPorts: '10050' },
    { category: 'Monitoring', label: 'Prometheus', code: 'prometheus', typicalPorts: '9090+' },
    { category: 'Network Services', label: 'DNS', code: 'dns', typicalPorts: '53' },
    { category: 'Network Services', label: 'NTP', code: 'ntp', typicalPorts: '123' },
    { category: 'Network Services', label: 'DHCP', code: 'dhcp', typicalPorts: '67, 68' },
    { category: 'Network Services', label: 'ICMP', code: 'icmp' },
    { category: 'Replication', label: 'AD Replication', code: 'ad-repl', typicalPorts: 'multiple' },
    { category: 'Replication', label: 'DFS-R', code: 'dfsr', typicalPorts: '5722' },
    { category: 'Replication', label: 'SQL AlwaysOn', code: 'sql-ag', typicalPorts: '5022' },
    { category: 'Replication', label: 'rsync', code: 'rsync', typicalPorts: '873' },
    { category: 'Replication', label: 'DRBD', code: 'drbd', typicalPorts: '7788' },
    { category: 'VPN / Tunnel', label: 'IPSec', code: 'ipsec', typicalPorts: '500, 4500' },
    { category: 'VPN / Tunnel', label: 'OpenVPN', code: 'openvpn', typicalPorts: '1194' },
    { category: 'VPN / Tunnel', label: 'WireGuard', code: 'wireguard', typicalPorts: '51820' },
    { category: 'VPN / Tunnel', label: 'SSL VPN', code: 'sslvpn', typicalPorts: '443' },
    { category: 'VPN / Tunnel', label: 'GRE', code: 'gre' },
    { category: 'Backup', label: 'Veeam', code: 'veeam', typicalPorts: 'multiple' },
    { category: 'Backup', label: 'Commvault', code: 'commvault', typicalPorts: '8400+' },
    { category: 'Backup', label: 'Bacula', code: 'bacula', typicalPorts: '9101-9103' },
    { category: 'Generic', label: 'TCP (custom)', code: 'tcp', typicalPorts: 'specify' },
    { category: 'Generic', label: 'UDP (custom)', code: 'udp', typicalPorts: 'specify' },
    { category: 'Generic', label: 'Other', code: 'other', typicalPorts: 'specify' },
    { category: 'Generic', label: 'Unknown', code: 'unknown' },
  ];

  private readonly defaultSubnets: SubnetOption[] = [];

  private readonly defaultIpAddressTypes: ItOpsEnumOption[] = [
    { code: 'host', label: 'Host' },
    { code: 'ipmi', label: 'IPMI' },
    { code: 'management', label: 'Management' },
    { code: 'iscsi', label: 'iSCSI' },
  ];

  private readonly defaultAccessMethods: ItOpsEnumOption[] = [
    { code: 'web', label: 'Web' },
    { code: 'local', label: 'Locally installed application' },
    { code: 'mobile', label: 'Mobile application' },
    { code: 'hmi', label: 'Proprietary HMI (industrial interface)' },
    { code: 'terminal', label: 'Terminal / CLI' },
    { code: 'vdi', label: 'VDI / Remote Desktop' },
    { code: 'kiosk', label: 'Kiosk' },
  ];

  private readonly lockedDomainCodes = new Set(['workgroup', 'n-a']);

  private readonly defaultDomains: DomainOption[] = [
    { code: 'workgroup', label: 'Workgroup', dns_suffix: '', system: true },
    { code: 'n-a', label: 'N/A', dns_suffix: '', system: true },
  ];

  constructor(
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
  ) {}

  private repo(manager?: EntityManager) {
    return manager ? manager.getRepository(Tenant) : this.tenants;
  }

  private locationRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Location) : this.locations;
  }

  private async getValidLocationIds(tenantId: string, manager?: EntityManager): Promise<Set<string>> {
    const repo = this.locationRepo(manager);
    const rows = await repo.find({
      where: { tenant_id: tenantId } as any,
      select: ['id'],
    });
    return new Set(rows.map((r) => r.id));
  }

  private normalizeCode(value: unknown): string {
    const code = String(value || '').trim().toLowerCase();
    if (!code) {
      throw new BadRequestException('code is required');
    }
    return code;
  }

  private normalizeLabel(value: unknown, fallbackCode: string): string {
    const label = String(value || '').trim();
    if (label) return label;
    return fallbackCode.toUpperCase();
  }

  private parseDate(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    const raw = String(value).trim();
    // Accept YYYY-MM-DD or DD/MM/YYYY
    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.exec(raw);
    if (isoMatch) return raw;
    const euMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    if (euMatch) {
      const [, dd, mm, yyyy] = euMatch;
      return `${yyyy}-${mm}-${dd}`;
    }
    throw new BadRequestException(`Invalid date format for ${fieldName}; use YYYY-MM-DD`);
  }

  private normalizeList(
    list: unknown,
    defaults: ItOpsEnumOption[],
  ): ItOpsEnumOption[] {
    const byCode = new Map<string, ItOpsEnumOption>();

    // If no tenant-specific list is provided, fall back to defaults
    const source: any[] | undefined = Array.isArray(list) ? (list as any[]) : defaults;

    for (const raw of source || []) {
      const code = this.normalizeCode(raw?.code ?? raw?.value);
      const label = this.normalizeLabel(raw?.label, code);
      const deprecated = !!raw?.deprecated;
      const category =
        raw?.category === 'on_prem' ? 'on_prem' : raw?.category === 'cloud' ? 'cloud' : undefined;
      byCode.set(code, {
        code,
        label,
        deprecated,
        ...(category ? { category } : {}),
      });
    }

    return Array.from(byCode.values());
  }

  private normalizeTieredList<T extends ItOpsEnumOption & { graph_tier?: GraphTier }>(
    list: unknown,
    defaults: T[],
  ): T[] {
    const validTiers = new Set<GraphTier>(['top', 'upper', 'center', 'lower', 'bottom']);
    const defaultTierByCode = new Map<string, GraphTier>(
      defaults.map((d) => [d.code, d.graph_tier || 'center']),
    );
    const byCode = new Map<string, T>();

    // If no tenant-specific list is provided, fall back to defaults
    const source: any[] | undefined = Array.isArray(list) ? (list as any[]) : defaults;

    for (const raw of source || []) {
      const code = this.normalizeCode(raw?.code ?? raw?.value);
      const label = this.normalizeLabel(raw?.label, code);
      const deprecated = !!raw?.deprecated;
      const rawTier = String(raw?.graph_tier ?? '')
        .trim()
        .toLowerCase() as GraphTier;
      const graph_tier = validTiers.has(rawTier)
        ? rawTier
        : defaultTierByCode.get(code) || 'center';

      byCode.set(code, {
        code,
        label,
        deprecated,
        graph_tier,
      } as T);
    }

    return Array.from(byCode.values());
  }

  private normalizeNetworkZones(
    list: unknown,
    defaults: ItOpsEnumOption[],
  ): ItOpsEnumOption[] {
    const byCode = new Map<string, ItOpsEnumOption>();

    // Process tenant's existing list if provided
    if (Array.isArray(list)) {
      for (const raw of list) {
        const code = this.normalizeCode(raw?.code ?? raw?.value);
        const label = this.normalizeLabel(raw?.label, code);
        const deprecated = !!raw?.deprecated;
        byCode.set(code, { code, label, deprecated });
      }
    }

    // Ensure all default zones are present (add any missing defaults at the end)
    for (const def of defaults) {
      if (!byCode.has(def.code)) {
        byCode.set(def.code, { ...def });
      }
    }

    return Array.from(byCode.values());
  }

  private normalizeOperatingSystems(
    list: unknown,
    defaults: OperatingSystemOption[],
  ): OperatingSystemOption[] {
    const byCode = new Map<string, OperatingSystemOption>();
    const source: any[] | undefined = Array.isArray(list) ? (list as any[]) : defaults;

    for (const raw of source || []) {
      const code = this.normalizeCode(raw?.code ?? raw?.value);
      const label = this.normalizeLabel(raw?.label ?? raw?.name, code);
      const deprecated = !!raw?.deprecated;
      const standardSupportEnd = this.parseDate(raw?.standardSupportEnd ?? raw?.standard_support_end, 'standardSupportEnd');
      const extendedSupportEnd = this.parseDate(raw?.extendedSupportEnd ?? raw?.extended_support_end, 'extendedSupportEnd');
      byCode.set(code, {
        code,
        label,
        deprecated,
        standardSupportEnd,
        extendedSupportEnd,
      });
    }

    return Array.from(byCode.values());
  }

  private normalizeConnectionTypes(
    list: unknown,
    defaults: ConnectionTypeOption[],
  ): ConnectionTypeOption[] {
    const byCode = new Map<string, ConnectionTypeOption>();
    const source: any[] | undefined = Array.isArray(list) ? (list as any[]) : defaults;

    for (const raw of source || []) {
      const code = this.normalizeCode(raw?.code ?? raw?.value);
      const label = this.normalizeLabel(raw?.label ?? raw?.name, code);
      const deprecated = !!raw?.deprecated;
      const category = String(raw?.category ?? '').trim();
      const rawPorts = raw?.typicalPorts ?? raw?.typical_ports ?? raw?.ports ?? raw?.port;
      const typicalPorts =
        rawPorts === undefined || rawPorts === null || String(rawPorts).trim() === ''
          ? undefined
          : String(rawPorts).trim();
      byCode.set(code, {
        code,
        label,
        deprecated,
        ...(category ? { category } : {}),
        ...(typicalPorts ? { typicalPorts } : {}),
      });
    }

    return Array.from(byCode.values());
  }

  private normalizeAssetKinds(
    list: unknown,
    defaults: AssetKindOption[],
  ): AssetKindOption[] {
    const byCode = new Map<string, AssetKindOption>();
    const defaultsMap = new Map(defaults.map((d) => [d.code, d]));

    // Process tenant's existing list if provided
    if (Array.isArray(list)) {
      for (const raw of list) {
        const code = this.normalizeCode(raw?.code ?? raw?.value);
        const label = this.normalizeLabel(raw?.label, code);
        const deprecated = !!raw?.deprecated;
        // Preserve is_physical from input, or fall back to default for known codes, or false
        let is_physical: boolean;
        if (raw?.is_physical !== undefined) {
          is_physical = !!raw.is_physical;
        } else {
          const def = defaultsMap.get(code);
          is_physical = def?.is_physical ?? false;
        }
        byCode.set(code, {
          code,
          label,
          deprecated,
          is_physical,
        });
      }
    }

    // Ensure all default types are present (add any missing defaults at the end)
    for (const def of defaults) {
      if (!byCode.has(def.code)) {
        byCode.set(def.code, { ...def });
      }
    }

    return Array.from(byCode.values());
  }

  private normalizeCidr(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;

    // Basic CIDR validation pattern: IPv4 address followed by /prefix
    const cidrPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
    const match = text.match(cidrPattern);
    if (!match) {
      throw new BadRequestException(`Invalid CIDR format "${value}"`);
    }

    // Validate octet values (0-255)
    const octets = [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10),
    ];
    for (const octet of octets) {
      if (octet < 0 || octet > 255) {
        throw new BadRequestException(`Invalid CIDR "${value}": octet value must be 0-255`);
      }
    }

    // Validate prefix length (0-32 for IPv4)
    const prefix = parseInt(match[5], 10);
    if (prefix < 0 || prefix > 32) {
      throw new BadRequestException(`Invalid CIDR "${value}": prefix length must be 0-32`);
    }

    return text;
  }

  private normalizeSubnets(
    list: unknown,
    defaults: SubnetOption[],
    networkZoneCodes: Set<string>,
    validLocationIds: Set<string>,
    opts?: { strict?: boolean },
  ): SubnetOption[] {
    const strict = opts?.strict ?? false;
    // Key: location_id:cidr for uniqueness within a location
    const byLocationCidr = new Map<string, SubnetOption>();
    // Key: location_id:vlan_number for VLAN uniqueness within a location
    const vlanByLocation = new Map<string, string>(); // location:vlan -> cidr

    // Get first valid location for legacy subnets without location_id
    const firstLocationId = validLocationIds.size > 0 ? Array.from(validLocationIds)[0] : null;

    // Process tenant's existing list if provided
    if (Array.isArray(list)) {
      for (const raw of list) {
        let location_id = String(raw?.location_id ?? '').trim();

        // Handle legacy subnets without location_id
        if (!location_id) {
          if (strict) {
            throw new BadRequestException('location_id is required for each subnet');
          }
          // Auto-assign to first location when reading legacy data
          if (firstLocationId) {
            location_id = firstLocationId;
          } else {
            continue; // Skip if no locations exist
          }
        }

        if (!validLocationIds.has(location_id)) {
          if (strict) {
            throw new BadRequestException(`Invalid location_id "${location_id}" for subnet`);
          }
          continue; // Skip subnets with invalid location_id when reading
        }

        const cidr = this.normalizeCidr(raw?.cidr);
        if (!cidr) continue;

        const network_zone = String(raw?.network_zone ?? '').trim().toLowerCase();
        if (!network_zone || !networkZoneCodes.has(network_zone)) {
          if (strict) {
            throw new BadRequestException(`Invalid network_zone "${raw?.network_zone}" for subnet ${cidr}`);
          }
          continue; // Skip subnets with invalid network_zone when reading
        }

        const vlan_number =
          raw?.vlan_number !== undefined && raw?.vlan_number !== null && String(raw.vlan_number).trim() !== ''
            ? parseInt(String(raw.vlan_number), 10)
            : undefined;
        if (vlan_number !== undefined && (isNaN(vlan_number) || vlan_number < 1 || vlan_number > 4094)) {
          if (strict) {
            throw new BadRequestException(`Invalid vlan_number for subnet ${cidr}. Must be between 1 and 4094.`);
          }
          continue; // Skip subnets with invalid vlan_number when reading
        }

        // Check for duplicate VLAN numbers within the same location
        if (vlan_number !== undefined) {
          const vlanKey = `${location_id}:${vlan_number}`;
          const existingCidr = vlanByLocation.get(vlanKey);
          if (existingCidr && existingCidr !== cidr) {
            if (strict) {
              throw new BadRequestException(
                `Duplicate VLAN number ${vlan_number} at this location: already assigned to subnet ${existingCidr}`,
              );
            }
            continue; // Skip duplicate VLANs when reading
          }
          vlanByLocation.set(vlanKey, cidr);
        }

        const description = String(raw?.description ?? '').trim() || undefined;
        const deprecated = !!raw?.deprecated;

        // Composite key: location_id:cidr (same CIDR can exist at different locations)
        const compositeKey = `${location_id}:${cidr}`;
        byLocationCidr.set(compositeKey, { location_id, cidr, vlan_number, network_zone, description, deprecated });
      }
    }

    // Ensure all default subnets are present (add any missing defaults at the end)
    for (const def of defaults) {
      const compositeKey = `${def.location_id}:${def.cidr}`;
      if (!byLocationCidr.has(compositeKey)) {
        byLocationCidr.set(compositeKey, { ...def });
      }
    }

    return Array.from(byLocationCidr.values());
  }

  private normalizeDomains(
    list: unknown,
    defaults: DomainOption[],
  ): DomainOption[] {
    const byCode = new Map<string, DomainOption>();

    // Ensure locked system entries are always present first
    for (const def of defaults.filter((d) => d.system)) {
      byCode.set(def.code, { ...def });
    }

    // Process tenant's existing list if provided
    if (Array.isArray(list)) {
      for (const raw of list) {
        const code = this.normalizeCode(raw?.code ?? raw?.value);
        // Skip if trying to override system entries
        if (this.lockedDomainCodes.has(code)) continue;

        const label = this.normalizeLabel(raw?.label, code);
        const dns_suffix = String(raw?.dns_suffix ?? label ?? '').trim().toLowerCase();
        const deprecated = !!raw?.deprecated;
        byCode.set(code, { code, label, dns_suffix, deprecated, system: false });
      }
    }

    // Add non-system defaults that weren't overridden
    for (const def of defaults.filter((d) => !d.system)) {
      if (!byCode.has(def.code)) {
        byCode.set(def.code, { ...def });
      }
    }

    return Array.from(byCode.values());
  }

  private async getMetadataSettings(
    tenant: Tenant,
    opts?: { manager?: EntityManager },
  ): Promise<ItOpsSettings> {
    const raw = (tenant.metadata?.it_ops as ItOpsMetadataShape | undefined) ?? {};
    const applicationCategories = this.normalizeList(raw.application_categories, this.defaultApplicationCategories);
    const dataClasses = this.normalizeList(raw.data_classes, this.defaultDataClasses);
    const networkSegments = this.normalizeNetworkZones(raw.network_segments, this.defaultNetworkSegments);
    const entities = this.normalizeTieredList(raw.entities, this.defaultEntities);
    const serverKinds = this.normalizeAssetKinds(raw.server_kinds, this.defaultServerKinds);
    const serverProviders = this.normalizeList(raw.server_providers, this.defaultServerProviders);
    const serverRoles = this.normalizeTieredList(raw.server_roles, this.defaultServerRoles);
    const hostingTypes = this.normalizeHostingTypes(raw.hosting_types, this.defaultHostingTypes);
    const lifecycleStates = this.normalizeLifecycleStates(raw.lifecycle_states, this.defaultLifecycleStates);
    const interfaceProtocols = this.normalizeList(raw.interface_protocols, this.defaultInterfaceProtocols);
    const interfaceDataCategories = this.normalizeList(
      (raw as any).interface_data_categories,
      this.defaultInterfaceDataCategories,
    );
    const interfaceTriggerTypes = this.normalizeList(
      (raw as any).interface_trigger_types,
      this.defaultInterfaceTriggerTypes,
    );
    const interfacePatterns = this.normalizeList(
      (raw as any).interface_patterns,
      this.defaultInterfacePatterns,
    );
    const interfaceFormats = this.normalizeList(
      (raw as any).interface_formats,
      this.defaultInterfaceFormats,
    );
    const interfaceAuthModes = this.normalizeList(
      (raw as any).interface_auth_modes,
      this.defaultInterfaceAuthModes,
    );
    const operatingSystems = this.normalizeOperatingSystems(
      (raw as any).operating_systems,
      this.defaultOperatingSystems,
    );
    const connectionTypes = this.normalizeConnectionTypes(
      (raw as any).connection_types,
      this.defaultConnectionTypes,
    );
    // Subnets need networkSegments codes and valid location IDs for validation
    const networkZoneCodes = new Set(networkSegments.map((n) => n.code));
    const validLocationIds = await this.getValidLocationIds(tenant.id, opts?.manager);
    const subnets = this.normalizeSubnets(
      (raw as any).subnets,
      this.defaultSubnets,
      networkZoneCodes,
      validLocationIds,
    );
    const domains = this.normalizeDomains(raw.domains, this.defaultDomains);
    const ipAddressTypes = this.normalizeList(raw.ip_address_types, this.defaultIpAddressTypes);
    const accessMethods = this.normalizeList(raw.access_methods, this.defaultAccessMethods);
    return {
      applicationCategories,
      dataClasses,
      networkSegments,
      entities,
      serverKinds,
      serverProviders,
      serverRoles,
      hostingTypes,
      lifecycleStates,
      interfaceProtocols,
      interfaceDataCategories,
      interfaceTriggerTypes,
      interfacePatterns,
      interfaceFormats,
      interfaceAuthModes,
      operatingSystems,
      connectionTypes,
      subnets,
      domains,
      ipAddressTypes,
      accessMethods,
    };
  }

  async getSettings(
    tenantId: string,
    opts?: { manager?: EntityManager },
  ): Promise<ItOpsSettings> {
    const repo = this.repo(opts?.manager);
    const tenant = await repo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }
    return this.getMetadataSettings(tenant, { manager: opts?.manager });
  }

  async updateSettings(
    tenantId: string,
    patch: Partial<ItOpsSettings>,
    opts?: { manager?: EntityManager },
  ): Promise<ItOpsSettings> {
    const repo = this.repo(opts?.manager);
    const tenant = await repo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const current = await this.getMetadataSettings(tenant, { manager: opts?.manager });
    const next: ItOpsSettings = { ...current };

    if (patch.applicationCategories) {
      next.applicationCategories = this.normalizeList(
        patch.applicationCategories,
        this.defaultApplicationCategories,
      );
    }
    if (patch.dataClasses) {
      next.dataClasses = this.normalizeList(
        patch.dataClasses,
        this.defaultDataClasses,
      );
    }
    if (patch.networkSegments) {
      next.networkSegments = this.normalizeNetworkZones(
        patch.networkSegments,
        this.defaultNetworkSegments,
      );
    }
    if (patch.entities) {
      next.entities = this.normalizeTieredList(
        patch.entities,
        this.defaultEntities,
      );
    }
    if (patch.serverKinds) {
      next.serverKinds = this.normalizeAssetKinds(
        patch.serverKinds,
        this.defaultServerKinds,
      );
    }
    if (patch.serverProviders) {
      next.serverProviders = this.normalizeList(
        patch.serverProviders,
        this.defaultServerProviders,
      );
    }
    if (patch.serverRoles) {
      next.serverRoles = this.normalizeTieredList(
        patch.serverRoles,
        this.defaultServerRoles,
      );
    }
    if (patch.hostingTypes) {
      next.hostingTypes = this.normalizeHostingTypes(
        patch.hostingTypes,
        this.defaultHostingTypes,
      );
    }
    if (patch.lifecycleStates) {
      next.lifecycleStates = this.normalizeLifecycleStates(
        patch.lifecycleStates,
        this.defaultLifecycleStates,
      );
    }
    if (patch.interfaceProtocols) {
      next.interfaceProtocols = this.normalizeList(patch.interfaceProtocols, this.defaultInterfaceProtocols);
    }
    if (patch.interfaceDataCategories) {
      next.interfaceDataCategories = this.normalizeList(
        patch.interfaceDataCategories,
        this.defaultInterfaceDataCategories,
      );
    }
    if (patch.interfaceTriggerTypes) {
      next.interfaceTriggerTypes = this.normalizeList(
        patch.interfaceTriggerTypes,
        this.defaultInterfaceTriggerTypes,
      );
    }
    if (patch.interfacePatterns) {
      next.interfacePatterns = this.normalizeList(
        patch.interfacePatterns,
        this.defaultInterfacePatterns,
      );
    }
    if (patch.interfaceFormats) {
      next.interfaceFormats = this.normalizeList(
        patch.interfaceFormats,
        this.defaultInterfaceFormats,
      );
    }
    if (patch.interfaceAuthModes) {
      next.interfaceAuthModes = this.normalizeList(
        patch.interfaceAuthModes,
        this.defaultInterfaceAuthModes,
      );
    }
    if (patch.operatingSystems) {
      next.operatingSystems = this.normalizeOperatingSystems(
        patch.operatingSystems,
        this.defaultOperatingSystems,
      );
    }
    if (patch.connectionTypes) {
      next.connectionTypes = this.normalizeConnectionTypes(
        patch.connectionTypes,
        this.defaultConnectionTypes,
      );
    }
    if (patch.subnets) {
      const networkZoneCodes = new Set(next.networkSegments.map((n) => n.code));
      const validLocationIds = await this.getValidLocationIds(tenantId, opts?.manager);
      next.subnets = this.normalizeSubnets(
        patch.subnets,
        this.defaultSubnets,
        networkZoneCodes,
        validLocationIds,
        { strict: true },
      );
    }
    if (patch.domains) {
      next.domains = this.normalizeDomains(patch.domains, this.defaultDomains);
    }
    if (patch.ipAddressTypes) {
      next.ipAddressTypes = this.normalizeList(patch.ipAddressTypes, this.defaultIpAddressTypes);
    }
    if (patch.accessMethods) {
      next.accessMethods = this.normalizeList(patch.accessMethods, this.defaultAccessMethods);
    }

    const meta: any = tenant.metadata || {};
    const itOps: any = {
      application_categories: next.applicationCategories,
      data_classes: next.dataClasses,
      network_segments: next.networkSegments,
      entities: next.entities,
      server_kinds: next.serverKinds,
      server_providers: next.serverProviders,
      server_roles: next.serverRoles,
      hosting_types: next.hostingTypes,
      lifecycle_states: next.lifecycleStates,
      interface_protocols: next.interfaceProtocols,
      interface_data_categories: next.interfaceDataCategories,
      interface_trigger_types: next.interfaceTriggerTypes,
      interface_patterns: next.interfacePatterns,
      interface_formats: next.interfaceFormats,
      interface_auth_modes: next.interfaceAuthModes,
      operating_systems: next.operatingSystems,
      connection_types: next.connectionTypes,
      subnets: next.subnets,
      domains: next.domains,
      ip_address_types: next.ipAddressTypes,
      access_methods: next.accessMethods,
    };
    meta.it_ops = itOps;
    tenant.metadata = meta;

    await repo.save(tenant);
    return next;
  }

  async resetToDefaults(
    tenantId: string,
    opts?: { manager?: EntityManager },
  ): Promise<ItOpsSettings> {
    const repo = this.repo(opts?.manager);
    const tenant = await repo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const meta: any = tenant.metadata || {};
    if (meta.it_ops) {
      delete meta.it_ops;
    }
    tenant.metadata = meta;

    await repo.save(tenant);
    return this.getMetadataSettings(tenant, { manager: opts?.manager });
  }

  private normalizeHostingTypes(list: unknown, defaults: ItOpsEnumOption[]): ItOpsEnumOption[] {
    const normalized = this.normalizeList(list, defaults);
    return normalized.map((item) => {
      let category: 'on_prem' | 'cloud' | undefined =
        item.category === 'on_prem' ? 'on_prem' : item.category === 'cloud' ? 'cloud' : undefined;
      if (!category) {
        category = item.code === 'on_prem' || item.code === 'colocation' ? 'on_prem' : 'cloud';
      }
      return { ...item, category };
    });
  }

  private normalizeLifecycleStates(list: unknown, defaults: ItOpsEnumOption[]): ItOpsEnumOption[] {
    const normalized = this.normalizeList(list, defaults);
    const extras = normalized.filter((item) => !this.lockedLifecycleCodes.has(item.code));
    return [...this.lockedLifecycleStates, ...extras];
  }
}
