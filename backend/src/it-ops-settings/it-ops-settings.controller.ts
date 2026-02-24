import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import {
  ConnectionTypeOption,
  DomainOption,
  ItOpsSettings,
  ItOpsSettingsService,
  OperatingSystemOption,
  SubnetOption,
} from './it-ops-settings.service';

@UseGuards(JwtAuthGuard)
@Controller('it-ops')
export class ItOpsSettingsController {
  constructor(private readonly settings: ItOpsSettingsService) {}

  private requireTenantId(req: any): string {
    const tenantId: string | undefined = req?.tenant?.id;
    if (!tenantId) {
      throw new Error('Tenant context is required for IT Ops settings');
    }
    return tenantId;
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('settings', 'reader')
  @Get('settings')
  async getSettings(@Req() req: any): Promise<ItOpsSettings> {
    const tenantId = this.requireTenantId(req);
    return this.settings.getSettings(tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('settings', 'admin')
  @Patch('settings')
  async updateSettings(@Body() body: any, @Req() req: any): Promise<ItOpsSettings> {
    const tenantId = this.requireTenantId(req);
    const patch: Partial<ItOpsSettings> = {};

    if (Array.isArray(body?.applicationCategories)) {
      patch.applicationCategories = body.applicationCategories.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.dataClasses)) {
      patch.dataClasses = body.dataClasses.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.networkSegments)) {
      patch.networkSegments = body.networkSegments.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.entities)) {
      patch.entities = body.entities.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
        graph_tier: row?.graph_tier,
      }));
    }

    if (Array.isArray(body?.serverKinds)) {
      patch.serverKinds = body.serverKinds.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.serverProviders)) {
      patch.serverProviders = body.serverProviders.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.serverRoles)) {
      patch.serverRoles = body.serverRoles.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
        graph_tier: row?.graph_tier,
      }));
    }

    if (Array.isArray(body?.hostingTypes)) {
      patch.hostingTypes = body.hostingTypes.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
        category: row?.category === 'on_prem' ? 'on_prem' : row?.category === 'cloud' ? 'cloud' : undefined,
      }));
    }

    if (Array.isArray(body?.lifecycleStates)) {
      patch.lifecycleStates = body.lifecycleStates.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfaceProtocols)) {
      patch.interfaceProtocols = body.interfaceProtocols.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfaceDataCategories)) {
      patch.interfaceDataCategories = body.interfaceDataCategories.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfaceTriggerTypes)) {
      patch.interfaceTriggerTypes = body.interfaceTriggerTypes.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfacePatterns)) {
      patch.interfacePatterns = body.interfacePatterns.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfaceFormats)) {
      patch.interfaceFormats = body.interfaceFormats.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.interfaceAuthModes)) {
      patch.interfaceAuthModes = body.interfaceAuthModes.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.operatingSystems)) {
      patch.operatingSystems = (body.operatingSystems as OperatingSystemOption[]).map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        deprecated: !!row?.deprecated,
        standardSupportEnd: row?.standardSupportEnd ?? row?.standard_support_end,
        extendedSupportEnd: row?.extendedSupportEnd ?? row?.extended_support_end,
      }));
    }

    if (Array.isArray(body?.connectionTypes)) {
      patch.connectionTypes = (body.connectionTypes as ConnectionTypeOption[]).map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        category: String(row?.category ?? '').trim(),
        typicalPorts: row?.typicalPorts ?? row?.typical_ports,
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.subnets)) {
      patch.subnets = body.subnets.map((row: any) => ({
        location_id: String(row?.location_id ?? '').trim(),
        cidr: String(row?.cidr ?? '').trim(),
        vlan_number: row?.vlan_number,
        network_zone: String(row?.network_zone ?? '').trim().toLowerCase(),
        description: row?.description,
        deprecated: !!row?.deprecated,
      }));
    }

    if (Array.isArray(body?.domains)) {
      patch.domains = body.domains.map((row: any) => ({
        code: String(row?.code ?? '').trim().toLowerCase(),
        label: String(row?.label ?? '').trim(),
        dns_suffix: String(row?.dns_suffix ?? '').trim().toLowerCase(),
        deprecated: !!row?.deprecated,
        system: !!row?.system,
      }));
    }

    return this.settings.updateSettings(tenantId, patch, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('settings', 'admin')
  @Post('settings/reset')
  async resetSettings(@Req() req: any): Promise<ItOpsSettings> {
    const tenantId = this.requireTenantId(req);
    return this.settings.resetToDefaults(tenantId, { manager: req?.queryRunner?.manager });
  }
}
