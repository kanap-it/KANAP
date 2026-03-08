import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessProcessMultiSelect from '../../../../components/fields/BusinessProcessMultiSelect';
import IntegratedDocumentEditor, { type IntegratedDocumentEditorHandle } from '../../../../components/IntegratedDocumentEditor';
import { MarkdownContent } from '../../../../components/MarkdownContent';
import FeasibilityReview from '../../editors/FeasibilityReview';

type RecommendationColor = 'default' | 'success' | 'error' | 'warning' | 'info';

type RequestAnalysisTabProps = {
  canEditManagedDocs: boolean;
  canManage: boolean;
  categoryName?: string;
  form: any;
  highlightLatestRecommendation: boolean;
  id: string;
  latestAnalysisRecommendation: any;
  latestRecommendationAuthor: string;
  latestRecommendationCreatedAt: string;
  latestRecommendationOutcome: string | null;
  latestRecommendationOutcomeColor: RecommendationColor;
  latestRecommendationStatusChange: [unknown, unknown] | undefined;
  onBusinessProcessesChange: (ids: string[]) => Promise<void>;
  onOpenActivity: () => void;
  onOpenRecommendationDialog: () => void;
  onRisksDraftChange: (value: string) => void;
  onRisksDirtyChange: (dirty: boolean) => void;
  onUpdateFeasibilityReview: (value: any) => void;
  recommendationButtonLabel: string;
  risksEditorRef: React.RefObject<IntegratedDocumentEditorHandle>;
  streamName?: string;
};

const hasContentValue = (value: unknown): boolean => {
  if (value == null) return false;
  const text = String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_~`>\-\[\]()!|]/g, '')
    .trim();
  return text.length > 0;
};

export default function RequestAnalysisTab({
  canEditManagedDocs,
  canManage,
  categoryName,
  form,
  highlightLatestRecommendation,
  id,
  latestAnalysisRecommendation,
  latestRecommendationAuthor,
  latestRecommendationCreatedAt,
  latestRecommendationOutcome,
  latestRecommendationOutcomeColor,
  latestRecommendationStatusChange,
  onBusinessProcessesChange,
  onOpenActivity,
  onOpenRecommendationDialog,
  onRisksDraftChange,
  onRisksDirtyChange,
  onUpdateFeasibilityReview,
  recommendationButtonLabel,
  risksEditorRef,
  streamName,
}: RequestAnalysisTabProps) {
  const hasLegacyAnalysis = hasContentValue(form?.current_situation) || hasContentValue(form?.expected_benefits);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Impacted Business Processes</Typography>
      <BusinessProcessMultiSelect
        label="Business Processes"
        value={(form?.business_processes || []).map((bp: any) => bp.id)}
        onChange={onBusinessProcessesChange}
        disabled={!canManage}
      />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 1 }}>Feasibility Review</Typography>
      <FeasibilityReview
        value={form?.feasibility_review}
        onChange={onUpdateFeasibilityReview}
        disabled={!canManage}
        categoryName={categoryName}
        streamName={streamName}
      />
      <Box>
        <IntegratedDocumentEditor
          ref={risksEditorRef}
          entityType="requests"
          entityId={id}
          slotKey="risks_mitigations"
          label="Risks & Mitigations"
          placeholder="List key residual risks, mitigation actions, and responsible owners..."
          minRows={12}
          maxRows={24}
          disabled={!canEditManagedDocs}
          draftValue={form?.risks || ''}
          onDraftChange={onRisksDraftChange}
          onDirtyChange={onRisksDirtyChange}
        />
      </Box>

      <Box
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Analysis Recommendation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Publish a formal decision to Activity with context "Analysis Recommendation".
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {latestAnalysisRecommendation && (
                <Button variant="outlined" onClick={onOpenActivity}>
                  View in Activity
                </Button>
              )}
              <Button
                variant="contained"
                color="warning"
                disabled={!canManage || form?.status === 'converted'}
                onClick={onOpenRecommendationDialog}
              >
                {recommendationButtonLabel}
              </Button>
            </Stack>
          </Stack>

          {latestAnalysisRecommendation ? (
            <Box
              sx={{
                p: 1.5,
                border: 1,
                borderColor: highlightLatestRecommendation ? 'success.main' : 'divider',
                borderRadius: 1,
                bgcolor: highlightLatestRecommendation ? 'success.light' : 'action.hover',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Latest recommendation
                </Typography>
                {latestRecommendationOutcome && (
                  <Chip
                    size="small"
                    color={latestRecommendationOutcomeColor}
                    label={latestRecommendationOutcome}
                  />
                )}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {latestRecommendationAuthor} • {latestRecommendationCreatedAt}
                </Typography>
              </Stack>
              {Array.isArray(latestRecommendationStatusChange) && latestRecommendationStatusChange.length === 2 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Status changed: {String(latestRecommendationStatusChange[0] || '')} → {String(latestRecommendationStatusChange[1] || '')}
                </Typography>
              )}
              {hasContentValue(latestAnalysisRecommendation.content) && (
                <Box sx={{ mt: 1, maxHeight: 140, overflow: 'hidden' }}>
                  <MarkdownContent content={latestAnalysisRecommendation.content} variant="compact" />
                </Box>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              No recommendation submitted yet.
            </Alert>
          )}
        </Stack>
      </Box>

      {hasLegacyAnalysis && (
        <Accordion disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Previous Analysis (Legacy)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {hasContentValue(form?.current_situation) && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Current Situation
                  </Typography>
                  <MarkdownContent content={form?.current_situation} />
                </Box>
              )}
              {hasContentValue(form?.expected_benefits) && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Expected Benefits
                  </Typography>
                  <MarkdownContent content={form?.expected_benefits} />
                </Box>
              )}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}
