import React, { forwardRef } from 'react';
import PortfolioRelationsEditor, { PortfolioRelationsEditorHandle } from './PortfolioRelationsEditor';

export type ProjectRelationsPanelHandle = PortfolioRelationsEditorHandle;

type Props = {
  id: string;
  autoSave?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onRelationsChange?: () => void;
};

export default forwardRef<ProjectRelationsPanelHandle, Props>(function ProjectRelationsPanel(
  { id, autoSave = false, onDirtyChange, onRelationsChange },
  ref,
) {
  return (
    <PortfolioRelationsEditor
      ref={ref}
      entityId={id}
      entityType="project"
      autoSave={autoSave}
      onDirtyChange={onDirtyChange}
      onRelationsChange={onRelationsChange}
    />
  );
});
