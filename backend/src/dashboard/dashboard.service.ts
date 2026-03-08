import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  UserDashboardConfig,
  DashboardTileConfig,
  DEFAULT_DASHBOARD_CONFIG,
} from './user-dashboard-config.entity';
import { UpdateDashboardConfigDto } from './dto/update-dashboard-config.dto';

interface ServiceOptions {
  manager?: EntityManager;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(UserDashboardConfig)
    private readonly repo: Repository<UserDashboardConfig>,
  ) {}

  private getRepo(manager?: EntityManager): Repository<UserDashboardConfig> {
    return manager ? manager.getRepository(UserDashboardConfig) : this.repo;
  }

  private mergeWithDefaults(tiles: DashboardTileConfig[]): DashboardTileConfig[] {
    const byId = new Map(tiles.map((tile) => [tile.id, tile]));
    const merged = DEFAULT_DASHBOARD_CONFIG.map((defaultTile) => {
      const existing = byId.get(defaultTile.id);
      return existing
        ? {
            ...existing,
            config: { ...defaultTile.config, ...(existing.config || {}) },
          }
        : { ...defaultTile, config: { ...defaultTile.config } };
    });

    const knownIds = new Set(DEFAULT_DASHBOARD_CONFIG.map((tile) => tile.id));
    const extras = tiles
      .filter((tile) => !knownIds.has(tile.id))
      .map((tile) => ({ ...tile, config: { ...(tile.config || {}) } }));

    return [...merged, ...extras]
      .sort((a, b) => a.order - b.order)
      .map((tile, index) => ({ ...tile, order: index + 1 }));
  }

  /**
   * Get user's dashboard configuration, returning defaults if none exists
   */
  async getConfig(
    userId: string,
    opts?: ServiceOptions,
  ): Promise<{ tiles: DashboardTileConfig[] }> {
    const repo = this.getRepo(opts?.manager);
    const config = await repo.findOne({
      where: { user_id: userId },
    });

    if (config) {
      return { tiles: this.mergeWithDefaults(config.tiles) };
    }

    // Return default configuration
    return {
      tiles: DEFAULT_DASHBOARD_CONFIG.map((tile) => ({
        ...tile,
        config: { ...tile.config },
      })),
    };
  }

  /**
   * Save user's dashboard configuration (upsert)
   */
  async saveConfig(
    userId: string,
    dto: UpdateDashboardConfigDto,
    opts?: ServiceOptions,
  ): Promise<{ tiles: DashboardTileConfig[] }> {
    const repo = this.getRepo(opts?.manager);

    // Check if config exists
    const existing = await repo.findOne({
      where: { user_id: userId },
    });

    if (existing) {
      // Update existing config
      existing.tiles = this.mergeWithDefaults(dto.tiles);
      await repo.save(existing);
      return { tiles: existing.tiles };
    }

    // Create new config (tenant_id will be set by default via app_current_tenant())
    const newConfig = repo.create({
      user_id: userId,
      tiles: this.mergeWithDefaults(dto.tiles),
    });
    await repo.save(newConfig);
    return { tiles: newConfig.tiles };
  }

  /**
   * Reset user's dashboard configuration to defaults
   */
  async resetConfig(
    userId: string,
    opts?: ServiceOptions,
  ): Promise<{ tiles: DashboardTileConfig[] }> {
    const repo = this.getRepo(opts?.manager);

    // Delete existing config if any
    await repo.delete({ user_id: userId });

    // Return default configuration
    return {
      tiles: DEFAULT_DASHBOARD_CONFIG.map((tile) => ({
        ...tile,
        config: { ...tile.config },
      })),
    };
  }
}
