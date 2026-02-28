import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import { Link } from 'react-router-dom';
import api from '../../../api';
import EnumAutocomplete from '../../../components/fields/EnumAutocomplete';
import DateEUField from '../../../components/fields/DateEUField';
import UserSelect from '../../../components/fields/UserSelect';
import UserMultiSelect from '../../../components/fields/UserMultiSelect';
import RelatedObjectSelect, { RelatedObjectType } from '../../../components/fields/RelatedObjectSelect';
import CompanySelect from '../../../components/fields/CompanySelect';
import TaskLogTimeDialog from './TaskLogTimeDialog';
import { useAuth } from '../../../auth/AuthContext';
import { TASK_STATUS_OPTIONS } from '../task.constants';

// Classification types
interface ClassificationSource {
  id: string;
  name: string;
  is_active: boolean;
}

interface ClassificationStream {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
}

interface ClassificationCategory {
  id: string;
  name: string;
  is_active: boolean;
  streams?: ClassificationStream[];
}

type SelectOption = { label: string; value: string };

function withCurrentOption(
  options: SelectOption[],
  currentId?: string | null,
  currentLabel?: string | null,
): SelectOption[] {
  if (!currentId) return options;
  if (options.some((o) => o.value === currentId)) return options;
  return [...options, { value: currentId, label: currentLabel || currentId }];
}

const PRIORITY_OPTIONS = [
  { label: 'Blocker (+10)', value: 'blocker' },
  { label: 'High (+5)', value: 'high' },
  { label: 'Normal (0)', value: 'normal' },
  { label: 'Low (-5)', value: 'low' },
  { label: 'Optional (-10)', value: 'optional' },
];

interface TaskData {
  id: string;
  status: string;
  task_type_id?: string | null;
  task_type_name?: string | null;
  priority_level: string;
  start_date: string | null;
  due_date: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  creator_id: string | null;
  creator_name: string | null;
  owner_ids: string[];
  viewer_ids: string[];
  labels: string[];
  related_object_type: string | null;
  related_object_id: string | null;
  related_object_name: string | null;
  phase_id: string | null;
  phase_name: string | null;
  // Classification fields
  source_id?: string | null;
  source_name?: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id?: string | null;
  company_name?: string | null;
}

interface TaskType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface RelationChangeParams {
  type: RelatedObjectType;
  id: string | null;
  name: string | null;
}

interface TaskSidebarProps {
  task: TaskData;
  onChange: (field: string, value: any) => void;
  readOnly?: boolean;
  totalTimeHours?: number;
  isCreate?: boolean;
  onRelationChange?: (params: RelationChangeParams) => void;
}

export default function TaskSidebar({
  task,
  onChange,
  readOnly = false,
  totalTimeHours = 0,
  isCreate = false,
  onRelationChange,
}: TaskSidebarProps) {
  const { hasLevel } = useAuth();
  const queryClient = useQueryClient();
  const [logTimeOpen, setLogTimeOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string[]>(() => (
    isCreate
      ? ['context', 'details', 'classification', 'people', 'dates']
      : ['context', 'details', 'time', 'people', 'dates']
  ));

  const isProjectTask = task.related_object_type === 'project';
  const isStandalone = !task.related_object_type;
  const canEditClassification = isStandalone || isProjectTask;
  const canManageStandaloneEntries = hasLevel('tasks', 'member');
  const canManageProjectEntries = hasLevel('portfolio_projects', 'contributor');
  const canLogTime = isProjectTask ? canManageProjectEntries : canManageStandaloneEntries;

  // Fetch task types from classification API
  const { data: taskTypesData } = useQuery({
    queryKey: ['portfolio-task-types'],
    queryFn: async () => {
      const res = await api.get('/portfolio/classification/task-types');
      return res.data as TaskType[];
    },
  });
  const taskTypeOptions = React.useMemo(() => {
    const activeOptions = (taskTypesData || [])
      .filter((t) => t.is_active)
      .map((t) => ({ label: t.name, value: t.id }));
    return withCurrentOption(activeOptions, task.task_type_id, task.task_type_name);
  }, [taskTypesData, task.task_type_id, task.task_type_name]);

  // Fetch classification data (sources, categories, streams) for standalone tasks
  const { data: classificationData } = useQuery({
    queryKey: ['portfolio-classification'],
    queryFn: async () => {
      const res = await api.get('/portfolio/classification/all');
      return res.data as {
        sources: ClassificationSource[];
        categories: ClassificationCategory[];
        streams: ClassificationStream[];
      };
    },
    enabled: canEditClassification && !readOnly,
  });

  const sources = classificationData?.sources?.filter((s) => s.is_active) || [];
  const categories = classificationData?.categories?.filter((c) => c.is_active) || [];
  const streams = classificationData?.streams?.filter((s) => s.is_active) || [];

  // Filter streams by selected category
  const filteredStreams = React.useMemo(() => {
    if (!task.category_id) return streams;
    return streams.filter((s) => s.category_id === task.category_id);
  }, [streams, task.category_id]);

  const sourceOptions = React.useMemo(() => {
    const options = sources.map((s) => ({ label: s.name, value: s.id }));
    return withCurrentOption(options, task.source_id, task.source_name);
  }, [sources, task.source_id, task.source_name]);

  const categoryOptions = React.useMemo(() => {
    const options = categories.map((c) => ({ label: c.name, value: c.id }));
    return withCurrentOption(options, task.category_id, task.category_name);
  }, [categories, task.category_id, task.category_name]);

  const streamOptions = React.useMemo(() => {
    const options = filteredStreams.map((s) => ({ label: s.name, value: s.id }));
    return withCurrentOption(options, task.stream_id, task.stream_name);
  }, [filteredStreams, task.stream_id, task.stream_name]);

  // Fetch phases for the project (if task is project-related and has a valid project ID)
  const { data: phases = [] } = useQuery({
    queryKey: ['project-phases', task.related_object_id],
    queryFn: async () => {
      if (task.related_object_type !== 'project' || !task.related_object_id) return [];
      const res = await api.get<Array<{ id: string; name: string }>>(`/portfolio/projects/${task.related_object_id}/phases`);
      return res.data;
    },
    enabled: task.related_object_type === 'project' && !!task.related_object_id,
  });

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(prev =>
      isExpanded ? [...prev, panel] : prev.filter(p => p !== panel)
    );
  };

  const formatHours = (hours: number) => {
    const days = Math.floor(hours / 8);
    const remaining = Math.round(hours % 8);
    if (days > 0 && remaining > 0) {
      return `${days} Day${days !== 1 ? 's' : ''} ${remaining} Hour${remaining !== 1 ? 's' : ''}`;
    } else if (days > 0) {
      return `${days} Day${days !== 1 ? 's' : ''}`;
    }
    return `${hours} Hour${hours !== 1 ? 's' : ''}`;
  };

  // Task types that don't support time logging
  const timeLoggingExcludedTypes = ['contract', 'spend_item', 'capex_item'];
  const supportsTimeLogging = isStandalone || !timeLoggingExcludedTypes.includes(task.related_object_type || '');
  const hasClassificationValues = Boolean(task.source_name || task.category_name || task.stream_name || task.company_name);
  const showClassificationSection = canEditClassification || hasClassificationValues;

  return (
    <Box sx={{ width: '100%' }}>
      {/* CONTEXT - First */}
      <Accordion
        expanded={expanded.includes('context')}
        onChange={handleAccordionChange('context')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">Context</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1.5}>
            {onRelationChange && !readOnly ? (
              <RelatedObjectSelect
                relationType={task.related_object_type as RelatedObjectType}
                relationId={task.related_object_id || null}
                relationName={task.related_object_name || null}
                onChangeType={(type) => onRelationChange({ type, id: null, name: null })}
                onChangeId={(id, name) =>
                  onRelationChange({ type: task.related_object_type as RelatedObjectType, id, name })
                }
                size="small"
              />
            ) : isStandalone ? (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                  Related To
                </Typography>
                <Typography sx={{ mt: 0.25, fontWeight: 600 }}>Standalone task</Typography>
              </Box>
            ) : (
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                  Related To
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <Typography component="span" fontWeight="bold">
                    {isProjectTask ? 'Project' : task.related_object_type === 'spend_item' ? 'Budget' :
                     task.related_object_type === 'contract' ? 'Contract' :
                     task.related_object_type === 'capex_item' ? 'CAPEX' : 'Related'}
                  </Typography>
                  <Typography component="span"> : </Typography>
                  <Typography
                    component={Link}
                    to={isProjectTask ? `/portfolio/projects/${task.related_object_id}` :
                        task.related_object_type === 'spend_item' ? `/ops/opex/${task.related_object_id}` :
                        task.related_object_type === 'contract' ? `/ops/contracts/${task.related_object_id}` :
                        task.related_object_type === 'capex_item' ? `/ops/capex/${task.related_object_id}` :
                        '#'}
                    sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {task.related_object_name || 'Unknown'}
                  </Typography>
                </Box>
              </Box>
            )}

            {isProjectTask && (
              readOnly ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Phase</Typography>
                  <Typography sx={{ mt: 0.25 }}>{task.phase_name || 'Project-level'}</Typography>
                </Box>
              ) : (
                <EnumAutocomplete
                  label="Phase"
                  value={task.phase_id || ''}
                  onChange={(v) => onChange('phase_id', v || null)}
                  options={[
                    { label: 'Project-level', value: '' },
                    ...phases.map((p) => ({ label: p.name, value: p.id })),
                  ]}
                  size="small"
                />
              )
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Divider />

      {/* TASK DETAILS - Second */}
      <Accordion
        expanded={expanded.includes('details')}
        onChange={handleAccordionChange('details')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">Task Details</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1.5}>
            {readOnly ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Task Type</Typography>
                <Typography sx={{ mt: 0.25 }}>
                  {task.task_type_name || taskTypeOptions.find((o) => o.value === task.task_type_id)?.label || '-'}
                </Typography>
              </Box>
            ) : (
              <EnumAutocomplete
                label="Task Type"
                value={task.task_type_id || ''}
                onChange={(v) => onChange('task_type_id', v || null)}
                options={taskTypeOptions}
                size="small"
              />
            )}

            {readOnly ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Priority</Typography>
                <Typography sx={{ mt: 0.25 }}>
                  {PRIORITY_OPTIONS.find((o) => o.value === task.priority_level)?.label || task.priority_level}
                </Typography>
              </Box>
            ) : (
              <EnumAutocomplete
                label="Priority"
                value={task.priority_level}
                onChange={(v) => onChange('priority_level', v)}
                options={PRIORITY_OPTIONS}
                size="small"
              />
            )}

            {readOnly ? (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Status</Typography>
                <Typography sx={{ mt: 0.25 }}>
                  {TASK_STATUS_OPTIONS.find((o) => o.value === task.status)?.label || task.status}
                </Typography>
              </Box>
            ) : (
              <EnumAutocomplete
                label="Status"
                value={task.status}
                onChange={(v) => {
                  if (v === 'done' && isProjectTask && totalTimeHours === 0) {
                    alert('Cannot mark task as done without logging time. Please log time first.');
                    return;
                  }
                  onChange('status', v);
                }}
                options={TASK_STATUS_OPTIONS.map((opt) => ({
                  ...opt,
                  label: opt.value === 'done' && isProjectTask && totalTimeHours === 0
                    ? `${opt.label} (requires time)`
                    : opt.label,
                }))}
                size="small"
              />
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {showClassificationSection && (
        <>
          <Divider />

          {/* CLASSIFICATION - Third */}
          <Accordion
            expanded={expanded.includes('classification')}
            onChange={handleAccordionChange('classification')}
            disableGutters
            elevation={0}
            sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight="bold">Classification</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={1.5}>
                {canEditClassification && !readOnly ? (
                  <>
                    <EnumAutocomplete
                      label="Source"
                      value={task.source_id || ''}
                      onChange={(v) => onChange('source_id', v || null)}
                      options={sourceOptions}
                      size="small"
                    />
                    <EnumAutocomplete
                      label="Category"
                      value={task.category_id || ''}
                      onChange={(v) => {
                        onChange('category_id', v || null);
                        // Clear stream if it doesn't belong to the new category
                        if (v && task.stream_id) {
                          const streamBelongsToCategory = streams.some(
                            (s) => s.id === task.stream_id && s.category_id === v,
                          );
                          if (!streamBelongsToCategory) {
                            onChange('stream_id', null);
                          }
                        }
                      }}
                      options={categoryOptions}
                      size="small"
                    />
                    <EnumAutocomplete
                      label="Stream"
                      value={task.stream_id || ''}
                      onChange={(v) => onChange('stream_id', v || null)}
                      options={streamOptions}
                      size="small"
                      disabled={!task.category_id}
                    />
                    <CompanySelect
                      label="Company"
                      value={task.company_id || null}
                      onChange={(v) => onChange('company_id', v)}
                      size="small"
                    />
                  </>
                ) : (
                  <>
                    {task.source_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Source</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>{task.source_name}</Typography>
                      </Box>
                    )}
                    {task.category_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Category</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>{task.category_name}</Typography>
                      </Box>
                    )}
                    {task.stream_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Stream</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>{task.stream_name}</Typography>
                      </Box>
                    )}
                    {task.company_name && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Company</Typography>
                        <Typography variant="body2" sx={{ mt: 0.25 }}>{task.company_name}</Typography>
                      </Box>
                    )}
                    {!hasClassificationValues && (
                      <Typography variant="body2" color="text.secondary">
                        No classification set.
                      </Typography>
                    )}
                  </>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* TIME - Fourth (hidden in create mode and for task types that don't support time logging) */}
      {!isCreate && supportsTimeLogging && (
        <>
          <Divider />

          <Accordion
            expanded={expanded.includes('time')}
            onChange={handleAccordionChange('time')}
            disableGutters
            elevation={0}
            sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" fontWeight="bold">Time</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={1.5}>
                {!readOnly && supportsTimeLogging && canLogTime && (
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    onClick={() => setLogTimeOpen(true)}
                  >
                    Log Time
                  </Button>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>Time Spent</Typography>
                  <Typography variant="h6" sx={{ mt: 0.25 }}>
                    {formatHours(totalTimeHours)}
                  </Typography>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <TaskLogTimeDialog
            open={logTimeOpen}
            onClose={() => setLogTimeOpen(false)}
            taskId={task.id}
            projectId={isProjectTask && task.related_object_id ? task.related_object_id : undefined}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['task-time-entries-sum', task.id] });
              queryClient.invalidateQueries({ queryKey: ['task-time-entries', task.id] });
              queryClient.invalidateQueries({ queryKey: ['tasks', task.id] });
              queryClient.invalidateQueries({ queryKey: ['task-activities', task.id] });
              if (isProjectTask && task.related_object_id) {
                queryClient.invalidateQueries({ queryKey: ['project', task.related_object_id] });
                queryClient.invalidateQueries({ queryKey: ['project-tasks-time-summary', task.related_object_id] });
              }
            }}
          />
        </>
      )}

      <Divider />

      {/* PEOPLE - Fifth */}
      <Accordion
        expanded={expanded.includes('people')}
        onChange={handleAccordionChange('people')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">People</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1.5}>
            <UserSelect
              label="Requestor"
              value={task.creator_id}
              onChange={(v) => onChange('creator_id', v)}
              disabled={readOnly}
              size="small"
            />
            <UserSelect
              label="Assignee"
              value={task.assignee_user_id}
              onChange={(v) => onChange('assignee_user_id', v)}
              disabled={readOnly}
              size="small"
            />
            <UserMultiSelect
              label="Viewers"
              value={task.viewer_ids || []}
              onChange={(v) => onChange('viewer_ids', v)}
              disabled={readOnly}
              size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Divider />

      {/* DATES - Sixth (Last) */}
      <Accordion
        expanded={expanded.includes('dates')}
        onChange={handleAccordionChange('dates')}
        disableGutters
        elevation={0}
        sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">Dates</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={1.5}>
            <DateEUField
              label="Start Date"
              valueYmd={task.start_date || ''}
              onChangeYmd={(v) => onChange('start_date', v || null)}
              disabled={readOnly}
              size="small"
            />
            <DateEUField
              label="Due Date"
              valueYmd={task.due_date || ''}
              onChangeYmd={(v) => onChange('due_date', v || null)}
              disabled={readOnly}
              size="small"
            />
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
