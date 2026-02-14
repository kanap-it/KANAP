import React from 'react';
import EntityTasksPanel from '../../../components/EntityTasksPanel';
import { useAuth } from '../../../auth/AuthContext';

type Props = {
  projectId: string;
  phases?: Array<{ id: string; name: string }>;
  disabled?: boolean;
};

export default function ProjectTasksPanel({ projectId, phases = [], disabled = false }: Props) {
  const { hasLevel } = useAuth();
  const canManage = hasLevel('portfolio_projects', 'member');

  return (
    <EntityTasksPanel
      entityType="project"
      entityId={projectId}
      phases={phases}
      disabled={disabled || !canManage}
    />
  );
}
