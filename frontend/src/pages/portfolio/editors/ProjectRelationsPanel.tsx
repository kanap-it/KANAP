import React, { forwardRef } from 'react';
import PortfolioRelationsEditor, { PortfolioRelationsEditorHandle } from './PortfolioRelationsEditor';

export type ProjectRelationsPanelHandle = PortfolioRelationsEditorHandle;

type Props = {
  id: string;
  autoSave?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<ProjectRelationsPanelHandle, Props>(function ProjectRelationsPanel(
  { id, autoSave = false, onDirtyChange },
  ref,
) {
  return (
    <PortfolioRelationsEditor
      ref={ref}
      entityId={id}
      entityType="project"
      autoSave={autoSave}
      onDirtyChange={onDirtyChange}
    />
  );
});
