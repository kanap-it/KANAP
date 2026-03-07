import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
  { value: 'obsolete', label: 'Obsolete' },
];

type RelationKey = 'applications' | 'assets' | 'projects' | 'requests' | 'tasks';
type RelationOption = { id: string; label: string };
type ContributorAssignments = {
  owner_user_id: string | null;
  author_user_ids: string[];
  reviewer_user_ids: string[];
  approver_user_ids: string[];
};
type ContributorOption = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  label: string;
};
type DocumentTypeOption = {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  is_system: boolean;
};

type ClassificationRow = {
  category_id: string;
  stream_id: string | null;
};

interface KnowledgeSidebarProps {
  doc: any;
  form: any;
  onChange: (field: string, value: any) => void;
  isCreate: boolean;
  editMode: boolean;
  canManage: boolean;
  canComment: boolean;
  contributorOptions: ContributorOption[];
  contributorAssignments: ContributorAssignments;
  onContributorAssignmentsChange: (next: ContributorAssignments) => void;
  onSaveContributors: () => void;
  savingContributors: boolean;
  contributorsDirty: boolean;
  contributorsError: string | null;
  documentTypeOptions: DocumentTypeOption[];
  // Folder options
  folderOptions: Array<{ id: string; label: string }>;
  // Classification
  classificationCategories: Array<any>;
  classificationStreams: Array<any>;
  classificationRows: ClassificationRow[];
  onClassificationRowsChange: (rows: ClassificationRow[]) => void;
  onSaveClassifications: () => void;
  savingClassifications: boolean;
  classificationsDirty: boolean;
  classificationError: string | null;
  // Relations
  relationSelections: Record<RelationKey, RelationOption[]>;
  onRelationSelectionsChange: (key: RelationKey, values: RelationOption[]) => void;
  relationSearch: Record<RelationKey, string>;
  onRelationSearchChange: (key: RelationKey, value: string) => void;
  relationOptions: Record<RelationKey, RelationOption[]>;
  onSaveRelations: () => void;
  savingRelations: boolean;
  relationsDirty: boolean;
  relationsError: string | null;
  // Files
  files: any[];
  onUploadFile: (file: File) => Promise<void>;
  onDeleteFile: (id: string) => Promise<void>;
  // Versions
  versions: any[];
  onRevertVersion: (versionNumber: number) => void;
  revertingVersion: boolean;
  lockToken: string | null;
  workflow: any;
  latestApprovedWorkflow: any;
  currentUserId: string | null;
  canApproveWorkflow: boolean;
  onApproveWorkflow: (comment: string) => Promise<void>;
  approvingWorkflow: boolean;
  onRequestWorkflowChanges: (comment: string) => Promise<void>;
  requestingWorkflowChanges: boolean;
  // Activity / Comments
  activities: any[];
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onPostComment: () => void;
  postingComment: boolean;
}

const RELATION_LABELS: Record<RelationKey, string> = {
  applications: 'Applications',
  assets: 'Assets',
  projects: 'Projects',
  requests: 'Requests',
  tasks: 'Tasks',
};

const accordionSx = {
  '&:before': { display: 'none' },
  bgcolor: 'transparent',
};

export default function KnowledgeSidebar({
  doc,
  form,
  onChange,
  isCreate,
  editMode,
  canManage,
  canComment,
  contributorOptions,
  contributorAssignments,
  onContributorAssignmentsChange,
  onSaveContributors,
  savingContributors,
  contributorsDirty,
  contributorsError,
  documentTypeOptions,
  folderOptions,
  classificationCategories,
  classificationStreams,
  classificationRows,
  onClassificationRowsChange,
  onSaveClassifications,
  savingClassifications,
  classificationsDirty,
  classificationError,
  relationSelections,
  onRelationSelectionsChange,
  relationSearch,
  onRelationSearchChange,
  relationOptions,
  onSaveRelations,
  savingRelations,
  relationsDirty,
  relationsError,
  files,
  onUploadFile,
  onDeleteFile,
  versions,
  onRevertVersion,
  revertingVersion,
  lockToken,
  workflow,
  latestApprovedWorkflow,
  currentUserId,
  canApproveWorkflow,
  onApproveWorkflow,
  approvingWorkflow,
  onRequestWorkflowChanges,
  requestingWorkflowChanges,
  activities,
  commentText,
  onCommentTextChange,
  onPostComment,
  postingComment,
}: KnowledgeSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'properties' | 'comments'>('properties');
  const [expanded, setExpanded] = React.useState<string[]>(['status', 'contributors', 'workflow']);
  const [workflowComment, setWorkflowComment] = React.useState('');

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded((prev) =>
      isExpanded ? [...prev, panel] : prev.filter((p) => p !== panel),
    );
  };

  const disabled = !editMode && !isCreate;
  const isManagedIntegratedDocument = !!doc?.is_managed_integrated_document;
  const managedMetadataDisabled = disabled || isManagedIntegratedDocument;
  const workflowActive = !!workflow?.is_active;
  const templateDocumentId = form?.template_document_id !== undefined
    ? form.template_document_id
    : doc?.template_document_id;
  const templateRef = doc?.template_document_item_number && templateDocumentId
    ? `DOC-${doc.template_document_item_number}`
    : (templateDocumentId ? String(templateDocumentId) : '');
  const templateTitle = form?.template_document_title !== undefined
    ? String(form.template_document_title || '')
    : String(doc?.template_document_title || '');
  const activeDocumentType = documentTypeOptions.find((row) => row.id === form?.document_type_id)
    || documentTypeOptions.find((row) => row.id === doc?.document_type_id)
    || null;
  const contributorRoleLabel: Record<string, string> = {
    owner: 'Owner',
    author: 'Author',
    reviewer: 'Reviewer',
    validator: 'Approver',
  };
  const readOnlyClassifications = Array.isArray(doc?.classifications)
    ? doc.classifications
        .map((row: any) => ({
          key: `${row?.category_id || 'category'}:${row?.stream_id || 'stream'}`,
          label: row?.stream_name
            ? `${row?.category_name || row?.category_id || 'Unknown'} / ${row.stream_name}`
            : (row?.category_name || row?.category_id || 'Unknown'),
        }))
        .filter((row: { label: string }) => !!row.label)
    : [];
  const readOnlyRelations = React.useMemo(() => (
    (Object.keys(RELATION_LABELS) as RelationKey[])
      .map((key) => ({
        key,
        label: RELATION_LABELS[key],
        items: (relationSelections[key] || []).map((entry) => ({
          id: entry.id,
          label: entry.label || entry.id,
        })),
      }))
      .filter((row) => row.items.length > 0)
  ), [relationSelections]);
  const mergedContributorOptions = React.useMemo(() => {
    const out = [...contributorOptions];
    const seen = new Set(out.map((row) => row.id));
    for (const row of Array.isArray(doc?.contributors) ? doc.contributors : []) {
      const id = String(row?.user_id || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        email: String(row?.email || ''),
        label: String(row?.user_name || row?.user_id || id),
      });
    }
    return out;
  }, [contributorOptions, doc?.contributors]);
  const formatContributorLabel = React.useCallback((option: ContributorOption) => {
    const firstName = String(option?.first_name || '').trim();
    const lastName = String(option?.last_name || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    return fullName || option?.label || option?.email || option?.id || '';
  }, []);
  const getContributorValue = React.useCallback((id: string | null | undefined) => {
    if (!id) return null;
    return mergedContributorOptions.find((row) => row.id === id) || null;
  }, [mergedContributorOptions]);
  const getContributorValues = React.useCallback((ids: string[]) => (
    ids
      .map((id) => getContributorValue(id))
      .filter((row): row is ContributorOption => !!row)
  ), [getContributorValue]);
  const reviewerParticipants = Array.isArray(workflow?.participants)
    ? workflow.participants.filter((row: any) => row?.stage === 'reviewer')
    : [];
  const approverParticipants = Array.isArray(workflow?.participants)
    ? workflow.participants.filter((row: any) => row?.stage === 'approver')
    : [];
  const hasReviewerStage = reviewerParticipants.length > 0;
  const hasApproverStage = approverParticipants.length > 0;
  const currentStage = workflow?.current_stage || null;
  const lastApprovedRevision = latestApprovedWorkflow?.requested_revision
    ? Number(latestApprovedWorkflow.requested_revision)
    : null;
  const recentWorkflowActivity = React.useMemo(() => (
    (activities || [])
      .map((activity: any) => {
        const content = String(activity?.content || '').trim();
        if (!content) return null;
        if (content === 'Review requested') {
          return {
            id: activity.id,
            label: 'Review requested',
            actor: activity.author_name || null,
            detail: null,
            created_at: activity.created_at,
          };
        }
        if (content === 'Approval requested' || content === 'Review stage completed. Approval requested.') {
          return {
            id: activity.id,
            label: 'Approval requested',
            actor: activity.author_name || null,
            detail: null,
            created_at: activity.created_at,
          };
        }
        if (content === 'Workflow approved and document published') {
          return {
            id: activity.id,
            label: 'Approved and published',
            actor: activity.author_name || null,
            detail: null,
            created_at: activity.created_at,
          };
        }
        if (content === 'Review cancelled') {
          return {
            id: activity.id,
            label: 'Review cancelled',
            actor: activity.author_name || null,
            detail: null,
            created_at: activity.created_at,
          };
        }
        const changesRequestedMatch = content.match(/^Changes requested by [^:]+:\s*(.+)$/i);
        if (changesRequestedMatch) {
          return {
            id: activity.id,
            label: 'Changes requested',
            actor: activity.author_name || null,
            detail: changesRequestedMatch[1] || null,
            created_at: activity.created_at,
          };
        }
        return null;
      })
      .filter((row): row is { id: string; label: string; actor: string | null; detail: string | null; created_at: string | null } => !!row)
      .slice(0, 3)
  ), [activities]);
  const currentStageExplanation = React.useMemo(() => {
    if (!workflowActive) return null;
    if (currentStage === 'reviewer') {
      return hasApproverStage
        ? 'Approvers are waiting. They will be notified only after all reviewers approve.'
        : 'This document will publish when all reviewers approve.';
    }
    if (currentStage === 'approver') {
      return 'This document will publish only when all approvers approve.';
    }
    return null;
  }, [currentStage, hasApproverStage, workflowActive]);
  const getStageState = React.useCallback((stage: 'reviewer' | 'approver', participants: any[]) => {
    if (!participants.length) return null;
    if (currentStage === stage) return 'active';
    if (stage === 'approver' && currentStage === 'reviewer') return 'waiting';
    if (participants.every((row: any) => row?.decision === 'approved')) return 'completed';
    return 'idle';
  }, [currentStage]);
  const reviewerStageState = getStageState('reviewer', reviewerParticipants);
  const approverStageState = getStageState('approver', approverParticipants);

  React.useEffect(() => {
    setWorkflowComment('');
  }, [workflow?.id]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5 } }}
      >
        <Tab value="properties" label="Properties" />
        <Tab value="comments" label="Comments" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {activeTab === 'properties' && (
          <Stack spacing={0}>
            {/* Status & Info — always visible */}
            <Stack spacing={1.5} sx={{ mb: 1 }}>
              {!isCreate && doc?.item_number && (
                <Typography variant="caption" color="text.secondary">
                  DOC-{doc.item_number} | Version {form.revision || 1}
                </Typography>
              )}
              {isManagedIntegratedDocument && (
                <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                  Managed document metadata is locked here. Use the source workspace to change title, folder, type, template, or source placement.
                </Alert>
              )}
              <TextField
                select
                label="Status"
                size="small"
                value={form.status || 'draft'}
                onChange={(e) => onChange('status', e.target.value)}
                disabled={disabled}
                fullWidth
              >
                {form.status === 'in_review' && (
                  <MenuItem value="in_review">In Review</MenuItem>
                )}
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Folder"
                size="small"
                value={form.folder_id || ''}
                onChange={(e) => onChange('folder_id', e.target.value || null)}
                disabled={managedMetadataDisabled}
                fullWidth
              >
                <MenuItem value="">Unfiled</MenuItem>
                {folderOptions.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    {folder.label}
                  </MenuItem>
                ))}
              </TextField>
              {documentTypeOptions.length > 0 ? (
                <TextField
                  select
                  label="Type"
                  size="small"
                  value={form.document_type_id || ''}
                  onChange={(e) => onChange('document_type_id', e.target.value || null)}
                  disabled={managedMetadataDisabled}
                  fullWidth
                >
                  {documentTypeOptions.map((option) => (
                    <MenuItem
                      key={option.id}
                      value={option.id}
                      disabled={!option.is_active && option.id !== form.document_type_id}
                    >
                      {option.name}
                      {option.is_default ? ' (Default)' : ''}
                      {!option.is_active ? ' (Inactive)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  label="Type"
                  size="small"
                  value={activeDocumentType?.name || 'Document'}
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              )}
              <TextField
                label="Based on template"
                size="small"
                value={templateTitle || 'None'}
                fullWidth
                InputProps={{ readOnly: true }}
              />
              {!!templateTitle && !!templateRef && (
                <Button size="small" href={`/knowledge/${templateRef}`} sx={{ alignSelf: 'flex-start', textTransform: 'none', px: 0 }}>
                  Open template
                </Button>
              )}
              <TextField
                label="Summary"
                size="small"
                value={form.summary || ''}
                onChange={(e) => onChange('summary', e.target.value)}
                multiline
                minRows={2}
                maxRows={4}
                disabled={disabled}
                fullWidth
              />
            </Stack>

            <Divider />

            {/* Contributors */}
            <Accordion
              expanded={expanded.includes('contributors')}
              onChange={handleAccordionChange('contributors')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Contributors</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {isCreate ? (
                  <Alert severity="info" sx={{ fontSize: '0.75rem' }}>Save first to manage owners, reviewers, and approvers.</Alert>
                ) : !canManage ? (
                  (doc?.contributors || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No contributors.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {(doc?.contributors || []).map((row: any) => (
                        <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Chip label={contributorRoleLabel[row.role] || row.role} size="small" variant="outlined" />
                          <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {row.user_name || row.user_id}
                          </Typography>
                          {row.is_primary && <Chip label="Primary" size="small" color="primary" />}
                        </Box>
                      ))}
                    </Stack>
                  )
                ) : (
                  <Stack spacing={0.75}>
                    <Autocomplete
                      size="small"
                      options={mergedContributorOptions}
                      value={getContributorValue(contributorAssignments.owner_user_id)}
                      onChange={(_, value) => onContributorAssignmentsChange({
                        ...contributorAssignments,
                        owner_user_id: value?.id || null,
                      })}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      getOptionLabel={formatContributorLabel}
                      renderInput={(params) => <TextField {...params} label="Owner" />}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      options={mergedContributorOptions}
                      value={getContributorValues(contributorAssignments.author_user_ids)}
                      onChange={(_, values) => onContributorAssignmentsChange({
                        ...contributorAssignments,
                        author_user_ids: values.map((row) => row.id),
                      })}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      getOptionLabel={formatContributorLabel}
                      renderInput={(params) => <TextField {...params} label="Authors" />}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      options={mergedContributorOptions}
                      value={getContributorValues(contributorAssignments.reviewer_user_ids)}
                      onChange={(_, values) => onContributorAssignmentsChange({
                        ...contributorAssignments,
                        reviewer_user_ids: values.map((row) => row.id),
                      })}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      getOptionLabel={formatContributorLabel}
                      renderInput={(params) => <TextField {...params} label="Reviewers" />}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      options={mergedContributorOptions}
                      value={getContributorValues(contributorAssignments.approver_user_ids)}
                      onChange={(_, values) => onContributorAssignmentsChange({
                        ...contributorAssignments,
                        approver_user_ids: values.map((row) => row.id),
                      })}
                      isOptionEqualToValue={(option, value) => option.id === value.id}
                      getOptionLabel={formatContributorLabel}
                      renderInput={(params) => <TextField {...params} label="Approvers" />}
                    />
                    {contributorsError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{contributorsError}</Alert>}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={onSaveContributors}
                      disabled={!contributorAssignments.owner_user_id || savingContributors || !contributorsDirty}
                    >
                      Save
                    </Button>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            <Divider />

            <Accordion
              expanded={expanded.includes('workflow')}
              onChange={handleAccordionChange('workflow')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Workflow</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  {workflowActive ? (
                    <>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap">
                        <Chip
                          size="small"
                          color="warning"
                          label={currentStage === 'approver' ? 'Awaiting Approval' : 'Awaiting Review'}
                        />
                        <Chip
                          size="small"
                          variant="outlined"
                          label={`Revision ${workflow?.requested_revision || form.revision || 1}`}
                        />
                      </Stack>
                      <Typography variant="body2">
                        Requested by {workflow?.requested_by_name || 'Unknown'}
                        {workflow?.requested_at ? ` on ${new Date(workflow.requested_at).toLocaleString()}` : ''}
                      </Typography>
                      {!!currentStageExplanation && (
                        <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                          {currentStageExplanation}
                        </Alert>
                      )}
                      {reviewerParticipants.length > 0 && (
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">
                              Stage 1: Review {reviewerParticipants.filter((row: any) => row?.decision === 'approved').length}/{reviewerParticipants.length}
                            </Typography>
                            <Chip
                              size="small"
                              color={reviewerStageState === 'active' ? 'warning' : reviewerStageState === 'completed' ? 'success' : 'default'}
                              variant={reviewerStageState === 'completed' ? 'filled' : 'outlined'}
                              label={reviewerStageState === 'active' ? 'Active' : reviewerStageState === 'completed' ? 'Completed' : 'Pending'}
                            />
                          </Stack>
                          {reviewerParticipants.map((row: any) => (
                            <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>{row.user_name || row.user_id}</Typography>
                              <Chip
                                size="small"
                                color={row.decision === 'approved' ? 'success' : row.decision === 'changes_requested' ? 'error' : 'default'}
                                label={row.decision === 'approved' ? 'Approved' : row.decision === 'changes_requested' ? 'Changes Requested' : 'Pending'}
                              />
                              {row.user_id === currentUserId && <Chip size="small" variant="outlined" label="You" />}
                              {!!row.comment && (
                                <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                                  {row.comment}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      {approverParticipants.length > 0 && (
                        <Stack spacing={0.5}>
                          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography variant="caption" color="text.secondary">
                              Stage 2: Approval {approverParticipants.filter((row: any) => row?.decision === 'approved').length}/{approverParticipants.length}
                            </Typography>
                            <Chip
                              size="small"
                              color={approverStageState === 'active' ? 'warning' : approverStageState === 'completed' ? 'success' : 'default'}
                              variant={approverStageState === 'completed' ? 'filled' : 'outlined'}
                              label={approverStageState === 'active' ? 'Active' : approverStageState === 'completed' ? 'Completed' : approverStageState === 'waiting' ? 'Waiting' : 'Pending'}
                            />
                          </Stack>
                          {approverParticipants.map((row: any) => (
                            <Box key={row.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography variant="body2" sx={{ flex: 1 }}>{row.user_name || row.user_id}</Typography>
                              <Chip
                                size="small"
                                color={row.decision === 'approved' ? 'success' : row.decision === 'changes_requested' ? 'error' : 'default'}
                                label={
                                  row.decision === 'approved'
                                    ? 'Approved'
                                    : row.decision === 'changes_requested'
                                      ? 'Changes Requested'
                                      : currentStage === 'reviewer'
                                        ? 'Waiting'
                                        : 'Pending'
                                }
                              />
                              {row.user_id === currentUserId && <Chip size="small" variant="outlined" label="You" />}
                              {!!row.comment && (
                                <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                                  {row.comment}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Stack>
                      )}
                      {canApproveWorkflow && (
                        <Stack spacing={1}>
                          <TextField
                            size="small"
                            label="Decision note"
                            multiline
                            minRows={2}
                            value={workflowComment}
                            onChange={(e) => setWorkflowComment(e.target.value)}
                            placeholder="Optional for approval, required for requesting changes"
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={async () => {
                                try {
                                  await onApproveWorkflow(workflowComment);
                                  setWorkflowComment('');
                                } catch {
                                  // Parent mutation surfaces the error.
                                }
                              }}
                              disabled={approvingWorkflow || requestingWorkflowChanges}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              color="warning"
                              variant="outlined"
                              onClick={async () => {
                                try {
                                  await onRequestWorkflowChanges(workflowComment);
                                  setWorkflowComment('');
                                } catch {
                                  // Parent mutation surfaces the error.
                                }
                              }}
                              disabled={approvingWorkflow || requestingWorkflowChanges || !workflowComment.trim()}
                            >
                              Request Changes
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {isManagedIntegratedDocument
                        ? 'Review workflow is unavailable for managed integrated docs.'
                        : 'No active workflow. You can still publish directly, or assign reviewers and approvers to use the optional review flow.'}
                    </Typography>
                  )}
                  <Divider />
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Last approved version
                    </Typography>
                    <Typography variant="body2">
                      {lastApprovedRevision != null ? `Revision ${lastApprovedRevision}` : 'Never approved'}
                    </Typography>
                    {lastApprovedRevision != null && latestApprovedWorkflow?.approved_at && (
                      <Typography variant="caption" color="text.secondary">
                        Approved on {new Date(latestApprovedWorkflow.approved_at).toLocaleString()}
                      </Typography>
                    )}
                  </Stack>
                  <Divider />
                  <Stack spacing={0.75}>
                    <Typography variant="caption" color="text.secondary">
                      Recent workflow activity
                    </Typography>
                    {recentWorkflowActivity.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No workflow activity yet.
                      </Typography>
                    ) : (
                      recentWorkflowActivity.map((entry) => (
                        <Box key={entry.id}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {entry.label}
                            {entry.actor ? ` • ${entry.actor}` : ''}
                          </Typography>
                          {entry.created_at && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(entry.created_at).toLocaleString()}
                            </Typography>
                          )}
                          {!!entry.detail && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                              {entry.detail}
                            </Typography>
                          )}
                        </Box>
                      ))
                    )}
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Divider />

            {/* Classification */}
            <Accordion
              expanded={expanded.includes('classification')}
              onChange={handleAccordionChange('classification')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Classification</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {isCreate ? (
                  <Alert severity="info" sx={{ fontSize: '0.75rem' }}>Save first to classify.</Alert>
                ) : !canManage ? (
                  readOnlyClassifications.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No classifications.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {readOnlyClassifications.map((row: { key: string; label: string }) => (
                        <Chip key={row.key} label={row.label} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )
                ) : (
                  <Stack spacing={1}>
                    {classificationRows.map((row, index) => {
                      const streamOptions = classificationStreams.filter((s: any) => s.category_id === row.category_id);
                      return (
                        <Stack key={`${index}-${row.category_id}`} spacing={0.75}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <TextField
                              select
                              label="Category"
                              size="small"
                              value={row.category_id}
                              onChange={(e) => {
                                onClassificationRowsChange(classificationRows.map((entry, idx) =>
                                  idx === index ? { category_id: e.target.value, stream_id: null } : entry,
                                ));
                              }}
                              sx={{ flex: 1 }}
                              disabled={!canManage}
                            >
                              <MenuItem value="">Select</MenuItem>
                              {classificationCategories.map((cat: any) => (
                                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                              ))}
                            </TextField>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onClassificationRowsChange(classificationRows.filter((_, idx) => idx !== index))}
                              disabled={!canManage}
                            >
                              <DeleteIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                          {row.category_id && streamOptions.length > 0 && (
                            <TextField
                              select
                              label="Stream"
                              size="small"
                              value={row.stream_id || ''}
                              onChange={(e) => {
                                onClassificationRowsChange(classificationRows.map((entry, idx) =>
                                  idx === index ? { ...entry, stream_id: e.target.value || null } : entry,
                                ));
                              }}
                              disabled={!canManage}
                              fullWidth
                            >
                              <MenuItem value="">None</MenuItem>
                              {streamOptions.map((s: any) => (
                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                              ))}
                            </TextField>
                          )}
                        </Stack>
                      );
                    })}
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => onClassificationRowsChange([...classificationRows, { category_id: '', stream_id: null }])}
                      disabled={!canManage}
                      sx={{ textTransform: 'none' }}
                    >
                      Add
                    </Button>
                    {classificationError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{classificationError}</Alert>}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={onSaveClassifications}
                      disabled={!canManage || savingClassifications || !classificationsDirty}
                    >
                      Save
                    </Button>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            <Divider />

            {/* Relations */}
            <Accordion
              expanded={expanded.includes('relations')}
              onChange={handleAccordionChange('relations')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Relations</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {isCreate ? (
                  <Alert severity="info" sx={{ fontSize: '0.75rem' }}>Save first to create relations.</Alert>
                ) : isManagedIntegratedDocument ? (
                  <Stack spacing={1}>
                    <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                      Managed documents keep their source relations read-only in Knowledge.
                    </Alert>
                    {readOnlyRelations.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No relations.</Typography>
                    ) : (
                      readOnlyRelations.map((group) => (
                        <Stack key={group.key} spacing={0.5}>
                          <Typography variant="caption" color="text.secondary">
                            {group.label}
                          </Typography>
                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            {group.items.map((item) => (
                              <Chip key={`${group.key}:${item.id}`} label={item.label} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </Stack>
                      ))
                    )}
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    {(Object.keys(RELATION_LABELS) as RelationKey[]).map((key) => {
                      const mergedOptions = [
                        ...relationOptions[key],
                        ...relationSelections[key].filter((s) => !relationOptions[key].some((o) => o.id === s.id)),
                      ];
                      return (
                        <Autocomplete
                          key={key}
                          multiple
                          size="small"
                          options={mergedOptions}
                          value={relationSelections[key]}
                          onChange={(_, values) => onRelationSelectionsChange(key, values)}
                          onInputChange={(_, value) => onRelationSearchChange(key, value)}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          getOptionLabel={(option) => option.label}
                          renderInput={(params) => (
                            <TextField {...params} label={RELATION_LABELS[key]} placeholder={`Search ${key}`} />
                          )}
                          disabled={!canManage}
                        />
                      );
                    })}
                    {relationsError && <Alert severity="error" sx={{ fontSize: '0.75rem' }}>{relationsError}</Alert>}
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={onSaveRelations}
                      disabled={!canManage || savingRelations || !relationsDirty}
                    >
                      Save
                    </Button>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            <Divider />

            {/* Files */}
            <Accordion
              expanded={expanded.includes('files')}
              onChange={handleAccordionChange('files')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Files</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {isCreate ? (
                  <Alert severity="info" sx={{ fontSize: '0.75rem' }}>Save first to upload files.</Alert>
                ) : (
                  <Stack spacing={1}>
                    <Box>
                      <Button
                        component="label"
                        size="small"
                        variant="outlined"
                        startIcon={<UploadFileIcon sx={{ fontSize: 16 }} />}
                        disabled={!canManage}
                        sx={{ textTransform: 'none' }}
                      >
                        Upload
                        <input
                          hidden
                          type="file"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            await onUploadFile(file);
                            event.currentTarget.value = '';
                          }}
                        />
                      </Button>
                    </Box>
                    {(files || []).map((file: any) => (
                      <Box key={file.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.original_filename}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {file.size ? `${Math.round(Number(file.size) / 1024)} KB` : ''}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={0.5}>
                          <Button size="small" href={`/api/knowledge/attachments/${file.id}`} target="_blank" sx={{ minWidth: 0, px: 0.5, fontSize: '0.7rem' }}>
                            DL
                          </Button>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onDeleteFile(file.id)}
                            disabled={!canManage}
                          >
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Stack>
                      </Box>
                    ))}
                    {(files || []).length === 0 && (
                      <Typography variant="body2" color="text.secondary">No files.</Typography>
                    )}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            <Divider />

            {/* Versions */}
            <Accordion
              expanded={expanded.includes('versions')}
              onChange={handleAccordionChange('versions')}
              disableGutters
              elevation={0}
              sx={accordionSx}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Versions</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={0.75}>
                  {(versions || []).map((version: any) => (
                    <Box key={version.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          v{version.version_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {version.created_at ? new Date(version.created_at).toLocaleString() : ''}
                          {version.change_note ? ` - ${version.change_note}` : ''}
                        </Typography>
                      </Box>
                      {editMode && !isCreate && (
                        <Button
                          size="small"
                          onClick={() => onRevertVersion(Number(version.version_number))}
                          disabled={revertingVersion || !lockToken}
                          sx={{ minWidth: 0, px: 1, fontSize: '0.7rem' }}
                        >
                          Revert
                        </Button>
                      )}
                    </Box>
                  ))}
                  {(versions || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">No versions yet.</Typography>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}

        {activeTab === 'comments' && (
          <Stack spacing={2}>
            {!isCreate && (
              <>
                <TextField
                  multiline
                  minRows={2}
                  size="small"
                  label="Add comment"
                  value={commentText}
                  onChange={(e) => onCommentTextChange(e.target.value)}
                  disabled={!canComment}
                />
                <Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={onPostComment}
                    disabled={!canComment || !commentText.trim() || postingComment}
                  >
                    Post
                  </Button>
                </Box>
                <Divider />
              </>
            )}

            {(activities || []).map((activity: any) => (
              <Box key={activity.id}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activity.author_name || 'Unknown'} - {activity.type}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                </Typography>
                {!!activity.content && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {activity.content}
                  </Typography>
                )}
              </Box>
            ))}
            {(activities || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">No activity yet.</Typography>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
