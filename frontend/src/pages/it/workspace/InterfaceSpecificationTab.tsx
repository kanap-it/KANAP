import React from 'react';
import IntegratedDocumentEditor, { type IntegratedDocumentEditorHandle } from '../../../components/IntegratedDocumentEditor';
import type { InterfaceDetail } from '../components/interface-workspace/types';

type InterfaceSpecificationTabProps = {
  canManage: boolean;
  data: InterfaceDetail | null;
  isCreate: boolean;
  specificationEditorRef: React.RefObject<IntegratedDocumentEditorHandle | null>;
  onManagedDocumentDirtyChange: (dirty: boolean) => void;
  update: (patch: Partial<InterfaceDetail>) => void;
  markDirty: () => void;
};

export default function InterfaceSpecificationTab({
  canManage,
  data,
  isCreate,
  specificationEditorRef,
  onManagedDocumentDirtyChange,
  update,
  markDirty,
}: InterfaceSpecificationTabProps) {
  return (
    <IntegratedDocumentEditor
      ref={specificationEditorRef as React.Ref<IntegratedDocumentEditorHandle>}
      entityType="interfaces"
      entityId={isCreate ? null : (data?.id || null)}
      slotKey="specification"
      label="Specification document"
      disabled={!canManage}
      draftValue={data?.specification_markdown || ''}
      onDraftChange={(value) => {
        markDirty();
        update({ specification_markdown: value });
      }}
      onDirtyChange={onManagedDocumentDirtyChange}
      editModeBehavior="auto"
      showDocumentControls={false}
      autosaveEnabled={false}
      minRows={18}
      maxRows={40}
      placeholder="Capture the managed interface specification here."
    />
  );
}
