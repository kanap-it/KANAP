import React from 'react';
import { Stack } from '@mui/material';
import ProjectScoringEditor, { type ProjectScoringEditorHandle } from '../../editors/ProjectScoringEditor';

type ProjectScoringTabProps = {
  form: any;
  mandatoryBypassEnabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onScoreChange: (score: number | null) => void;
  readOnly: boolean;
  scoringEditorRef: React.RefObject<ProjectScoringEditorHandle>;
};

export default function ProjectScoringTab({
  form,
  mandatoryBypassEnabled,
  onDirtyChange,
  onScoreChange,
  readOnly,
  scoringEditorRef,
}: ProjectScoringTabProps) {
  return (
    <Stack spacing={3}>
      <ProjectScoringEditor
        ref={scoringEditorRef}
        projectId={form?.id}
        criteriaValues={form?.criteria_values || {}}
        priorityScore={form?.priority_score}
        priorityOverride={form?.priority_override || false}
        overrideValue={form?.override_value}
        overrideJustification={form?.override_justification}
        sourceRequestId={form?.origin === 'standard' ? form?.source_requests?.[0]?.id : null}
        sourceRequestName={form?.origin === 'standard' ? form?.source_requests?.[0]?.name : null}
        mandatoryBypassEnabled={mandatoryBypassEnabled}
        readOnly={readOnly}
        onScoreChange={onScoreChange}
        onDirtyChange={onDirtyChange}
      />
    </Stack>
  );
}
