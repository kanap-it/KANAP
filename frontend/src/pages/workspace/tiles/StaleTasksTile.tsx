import DashboardTile, { TileEmptyState } from './DashboardTile';

interface StaleTasksTileProps {
  config: Record<string, unknown>;
}

export default function StaleTasksTile({ config: _config }: StaleTasksTileProps) {
  return (
    <DashboardTile title="Stale Tasks" icon="Warning">
      <TileEmptyState message="Coming soon in Phase 2" />
    </DashboardTile>
  );
}
