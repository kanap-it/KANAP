import DashboardTile, { TileEmptyState } from './DashboardTile';

interface TeamActivityTileProps {
  config: Record<string, unknown>;
}

export default function TeamActivityTile({ config: _config }: TeamActivityTileProps) {
  return (
    <DashboardTile title="Team Activity" icon="Update">
      <TileEmptyState message="Coming soon in Phase 2" />
    </DashboardTile>
  );
}
