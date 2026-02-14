import DashboardTile, { TileEmptyState } from './DashboardTile';

interface GlobalStatusChangesTileProps {
  config: Record<string, unknown>;
}

export default function GlobalStatusChangesTile({ config: _config }: GlobalStatusChangesTileProps) {
  return (
    <DashboardTile title="Project Status Changes" icon="SwapHoriz">
      <TileEmptyState message="Coming soon in Phase 2" />
    </DashboardTile>
  );
}
