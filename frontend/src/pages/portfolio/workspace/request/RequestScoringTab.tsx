import React from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import RequestScoringEditor, { type RequestScoringEditorHandle } from '../../editors/RequestScoringEditor';

type RequestScoringTabProps = {
  form: any;
  mandatoryBypassEnabled: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onScoreChange: (score: number | null) => void;
  readOnly: boolean;
  scoringEditorRef: React.RefObject<RequestScoringEditorHandle>;
};

export default function RequestScoringTab({
  form,
  mandatoryBypassEnabled,
  onDirtyChange,
  onScoreChange,
  readOnly,
  scoringEditorRef,
}: RequestScoringTabProps) {
  const { t } = useTranslation('portfolio');
  return (
    <Stack spacing={3}>
      {form?.status === 'converted' && (
        <Alert severity="info">
          {t('workspace.request.scoring.frozen')}
        </Alert>
      )}
      <RequestScoringEditor
        ref={scoringEditorRef}
        requestId={form?.id}
        criteriaValues={form?.criteria_values || {}}
        priorityScore={form?.priority_score}
        priorityOverride={form?.priority_override || false}
        overrideValue={form?.override_value}
        overrideJustification={form?.override_justification}
        mandatoryBypassEnabled={mandatoryBypassEnabled}
        readOnly={readOnly}
        onScoreChange={onScoreChange}
        onDirtyChange={onDirtyChange}
      />
    </Stack>
  );
}
