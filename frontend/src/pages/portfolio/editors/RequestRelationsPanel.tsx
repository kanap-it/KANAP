import React, { forwardRef } from 'react';
import PortfolioRelationsEditor, { PortfolioRelationsEditorHandle } from './PortfolioRelationsEditor';

export type RequestRelationsPanelHandle = PortfolioRelationsEditorHandle;

type Props = {
  id: string;
  autoSave?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

export default forwardRef<RequestRelationsPanelHandle, Props>(function RequestRelationsPanel(
  { id, autoSave = false, onDirtyChange },
  ref,
) {
  return (
    <PortfolioRelationsEditor
      ref={ref}
      entityId={id}
      entityType="request"
      autoSave={autoSave}
      onDirtyChange={onDirtyChange}
    />
  );
});
