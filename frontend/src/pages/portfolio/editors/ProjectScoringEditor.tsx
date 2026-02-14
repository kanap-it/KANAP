import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Checkbox, CircularProgress,
  FormControlLabel, Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import api from '../../../api';

interface CriterionValue {
  id: string;
  label: string;
  position: number;
  triggers_mandatory_bypass: boolean;
}

interface Criterion {
  id: string;
  name: string;
  enabled: boolean;
  inverted: boolean;
  weight: number;
  values: CriterionValue[];
}

interface Props {
  projectId: string;
  criteriaValues: Record<string, string>;
  priorityScore: number | null;
  priorityOverride: boolean;
  overrideValue: number | null;
  overrideJustification: string | null;
  sourceRequestId?: string | null;
  sourceRequestName?: string | null;
  mandatoryBypassEnabled?: boolean;
  readOnly?: boolean;
  onScoreChange?: (newScore: number | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export type ProjectScoringEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<number | null>;
  reset: () => void;
};

export const ProjectScoringEditor = forwardRef<ProjectScoringEditorHandle, Props>(
  function ProjectScoringEditor(
    {
      projectId,
      criteriaValues: initialValues,
      priorityScore,
      priorityOverride: initialOverride,
      overrideValue: initialOverrideValue,
      overrideJustification: initialJustification,
      sourceRequestId,
      sourceRequestName,
      mandatoryBypassEnabled = false,
      readOnly,
      onScoreChange,
      onDirtyChange,
    },
    ref,
  ) {
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [values, setValues] = useState<Record<string, string>>(initialValues || {});
    const [override, setOverride] = useState(initialOverride);
    const [overrideVal, setOverrideVal] = useState(initialOverrideValue ?? 50);
    const [justification, setJustification] = useState(initialJustification || '');
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bypassActive, setBypassActive] = useState(false);
    const [calculatedScore, setCalculatedScore] = useState<number | null>(priorityScore);

    // Original request scoring state (for comparison panel)
    const [originalRequest, setOriginalRequest] = useState<any>(null);
    const [loadingOriginal, setLoadingOriginal] = useState(false);
    const [originalExpanded, setOriginalExpanded] = useState(false);

    const skipNextPropSync = useRef(false);

    // Load criteria once on mount
    useEffect(() => {
      const load = async () => {
        try {
          const res = await api.get('/portfolio/criteria');
          const enabledCriteria = (res.data || []).filter((c: Criterion) => c.enabled);
          setCriteria(enabledCriteria);
        } catch (e) {
          console.error('Failed to load criteria', e);
        }
      };
      load();
    }, []);

    // Load original request scoring when accordion is expanded
    useEffect(() => {
      // Validate sourceRequestId is a proper UUID before making the request
      const isValidUuid = sourceRequestId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceRequestId);
      if (originalExpanded && isValidUuid && !originalRequest && !loadingOriginal) {
        setLoadingOriginal(true);
        api.get(`/portfolio/requests/${sourceRequestId}`)
          .then((res) => {
            setOriginalRequest(res.data);
          })
          .catch((e) => {
            console.error('Failed to load original request', e);
          })
          .finally(() => {
            setLoadingOriginal(false);
          });
      }
    }, [originalExpanded, sourceRequestId, originalRequest, loadingOriginal]);

    // Only sync from props on INITIAL load (not when dirty)
    useEffect(() => {
      if (skipNextPropSync.current) {
        skipNextPropSync.current = false;
        return;
      }
      if (!dirty) {
        setValues(initialValues || {});
        setOverride(initialOverride);
        setOverrideVal(initialOverrideValue ?? 50);
        setJustification(initialJustification || '');
        setCalculatedScore(priorityScore);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialValues, initialOverride, initialOverrideValue, initialJustification, priorityScore]);

    const checkBypassActive = useCallback((crits: Criterion[], vals: Record<string, string>) => {
      // Only check for bypass if the feature is enabled in settings
      if (!mandatoryBypassEnabled) {
        setBypassActive(false);
        return false;
      }
      for (const c of crits) {
        const selectedId = vals[c.id];
        if (!selectedId) continue;
        const value = c.values.find((v) => v.id === selectedId);
        if (value?.triggers_mandatory_bypass) {
          setBypassActive(true);
          return true;
        }
      }
      setBypassActive(false);
      return false;
    }, [mandatoryBypassEnabled]);

    const calculateLocalScore = useCallback((
      crits: Criterion[],
      vals: Record<string, string>,
    ): number | null => {
      if (crits.length === 0) return null;

      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const criterion of crits) {
        if (!criterion.values || criterion.values.length < 2) continue;

        const weight = Number(criterion.weight) || 1;
        const selectedValueId = vals[criterion.id];
        const maxPosition = criterion.values.length - 1;

        if (maxPosition === 0) continue;

        let position = 0;
        if (selectedValueId) {
          const selectedValue = criterion.values.find(v => v.id === selectedValueId);
          if (selectedValue && typeof selectedValue.position === 'number') {
            position = selectedValue.position;
          }
        }

        let percentage: number;
        if (criterion.inverted) {
          percentage = ((maxPosition - position) / maxPosition) * 100;
        } else {
          percentage = (position / maxPosition) * 100;
        }

        if (isNaN(percentage)) percentage = 0;

        totalWeightedScore += percentage * weight;
        totalWeight += weight;
      }

      if (totalWeight === 0) return 0;
      const result = Math.round((totalWeightedScore / totalWeight) * 100) / 100;
      return isNaN(result) ? 0 : result;
    }, []);

    useEffect(() => {
      if (criteria.length > 0) {
        checkBypassActive(criteria, values);
        if (!dirty && priorityScore == null) {
          const score = calculateLocalScore(criteria, values);
          setCalculatedScore(score);
        }
      }
    }, [criteria, values, dirty, priorityScore, checkBypassActive, calculateLocalScore]);

    const handleValueChange = (criterionId: string, valueId: string | null) => {
      const next = { ...values };
      if (valueId) {
        next[criterionId] = valueId;
      } else {
        delete next[criterionId];
      }

      setValues(next);
      setDirty(true);
      onDirtyChange?.(true);

      const isBypass = checkBypassActive(criteria, next);
      if (isBypass) {
        setCalculatedScore(100);
      } else {
        const newScore = calculateLocalScore(criteria, next);
        setCalculatedScore(newScore);
      }
    };

    const handleOverrideChange = (enabled: boolean) => {
      setOverride(enabled);
      setDirty(true);
      onDirtyChange?.(true);
    };

    const handleOverrideValChange = (val: number) => {
      setOverrideVal(val);
      setDirty(true);
      onDirtyChange?.(true);
    };

    const handleJustificationChange = (val: string) => {
      setJustification(val);
      setDirty(true);
      onDirtyChange?.(true);
    };

    useImperativeHandle(ref, () => ({
      isDirty: () => dirty,
      save: async (): Promise<number | null> => {
        setError(null);
        try {
          // Save criteria values
          const res = await api.post(`/portfolio/criteria/projects/${projectId}/score`, {
            criteria_values: values,
          });

          const newScore = res.data?.priority_score;
          setCalculatedScore(newScore);
          onScoreChange?.(newScore);

          // Save override if enabled
          let finalScore = newScore;
          if (override) {
            await api.post(`/portfolio/criteria/projects/${projectId}/override`, {
              enabled: true,
              value: overrideVal,
              justification: justification,
            });
            finalScore = overrideVal;
          } else if (initialOverride && !override) {
            await api.post(`/portfolio/criteria/projects/${projectId}/override`, {
              enabled: false,
            });
          }

          skipNextPropSync.current = true;
          setDirty(false);
          onDirtyChange?.(false);

          return finalScore;
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Failed to save scoring');
          throw e;
        }
      },
      reset: () => {
        setValues(initialValues || {});
        setOverride(initialOverride);
        setOverrideVal(initialOverrideValue ?? 50);
        setJustification(initialJustification || '');
        setDirty(false);
        onDirtyChange?.(false);
      },
    }), [dirty, values, override, overrideVal, justification, projectId, initialOverride, initialValues, initialOverrideValue, initialJustification, onScoreChange, onDirtyChange]);

    const liveScore = bypassActive ? 100 : calculateLocalScore(criteria, values);
    const displayScore = override && !bypassActive ? overrideVal : liveScore;

    // Helper to get selected value label for a criterion
    const getValueLabel = (criterionId: string, criteriaVals: Record<string, string>) => {
      const criterion = criteria.find(c => c.id === criterionId);
      if (!criterion) return '-';
      const valueId = criteriaVals[criterionId];
      if (!valueId) return '-';
      const value = criterion.values.find(v => v.id === valueId);
      return value?.label || '-';
    };

    return (
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Score Display */}
        <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
          <Typography variant="h2" fontWeight="bold">
            {displayScore != null && !isNaN(displayScore) ? Math.round(displayScore) : '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Priority Score
            {bypassActive && ' (Mandatory Bypass)'}
            {override && !bypassActive && ' (Override)'}
          </Typography>
        </Box>

        <Divider />

        {/* Criteria Evaluation */}
        <Typography variant="h6">Evaluation Criteria</Typography>

        {criteria.length === 0 && (
          <Alert severity="info">No evaluation criteria configured. Configure criteria in Portfolio Settings.</Alert>
        )}

        {criteria.map((criterion) => (
          <Box key={criterion.id}>
            <Typography variant="subtitle2" gutterBottom>
              {criterion.name}
              {criterion.weight !== 1 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (weight: {criterion.weight})
                </Typography>
              )}
              {criterion.inverted && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  (inverted)
                </Typography>
              )}
            </Typography>
            <ToggleButtonGroup
              value={values[criterion.id] || null}
              exclusive
              onChange={(_, val) => handleValueChange(criterion.id, val)}
              disabled={readOnly}
              size="small"
              sx={{ flexWrap: 'wrap' }}
            >
              {criterion.values.map((v) => (
                <ToggleButton
                  key={v.id}
                  value={v.id}
                  sx={{
                    textTransform: 'none',
                    minWidth: 100,
                    ...(v.triggers_mandatory_bypass && {
                      borderColor: 'error.main',
                      '&.Mui-selected': { bgcolor: 'error.light' },
                    }),
                  }}
                >
                  {v.label}
                  {v.triggers_mandatory_bypass && ' *'}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        ))}

        <Divider />

        {/* Manual Override */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={override}
                onChange={(e) => handleOverrideChange(e.target.checked)}
                disabled={readOnly || bypassActive}
              />
            }
            label="Enable priority override"
          />
          {bypassActive && (
            <Typography variant="caption" color="text.secondary" display="block">
              Manual override is disabled when mandatory bypass is active
            </Typography>
          )}
        </Box>

        {override && !bypassActive && (
          <Stack spacing={2}>
            <Box>
              <Typography gutterBottom>Override Value: {overrideVal}</Typography>
              <Slider
                value={overrideVal}
                onChange={(_, val) => handleOverrideValChange(val as number)}
                min={0}
                max={100}
                disabled={readOnly}
              />
            </Box>
            <TextField
              label="Justification"
              value={justification}
              onChange={(e) => handleJustificationChange(e.target.value)}
              multiline
              rows={2}
              required
              disabled={readOnly}
              fullWidth
              helperText="Justification is required when using priority override"
            />
          </Stack>
        )}

        {/* Original Request Scoring Comparison Panel */}
        {sourceRequestId && (
          <>
            <Divider />
            <Accordion
              expanded={originalExpanded}
              onChange={(_, expanded) => setOriginalExpanded(expanded)}
              disableGutters
              elevation={0}
              square
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Original Request Scoring
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Frozen scoring from: {sourceRequestName || 'Source Request'}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: 'action.hover' }}>
                {loadingOriginal ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Loading original scoring...</Typography>
                  </Stack>
                ) : originalRequest ? (
                  <Stack spacing={2}>
                    {/* Original Score Display */}
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="h4" fontWeight="bold" color="text.secondary">
                        {originalRequest.priority_score != null
                          ? Math.round(originalRequest.priority_score)
                          : '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Original Score
                        {originalRequest.priority_override && ' (Override)'}
                      </Typography>
                    </Box>

                    {/* Comparison Table */}
                    <Box sx={{ overflowX: 'auto' }}>
                      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Box component="thead">
                          <Box component="tr" sx={{ bgcolor: 'background.paper' }}>
                            <Box component="th" sx={{ p: 1, textAlign: 'left', borderBottom: 1, borderColor: 'divider' }}>
                              <Typography variant="caption" fontWeight={600}>Criterion</Typography>
                            </Box>
                            <Box component="th" sx={{ p: 1, textAlign: 'left', borderBottom: 1, borderColor: 'divider' }}>
                              <Typography variant="caption" fontWeight={600}>Original</Typography>
                            </Box>
                            <Box component="th" sx={{ p: 1, textAlign: 'left', borderBottom: 1, borderColor: 'divider' }}>
                              <Typography variant="caption" fontWeight={600}>Current</Typography>
                            </Box>
                          </Box>
                        </Box>
                        <Box component="tbody">
                          {criteria.map((criterion) => {
                            const originalVal = getValueLabel(criterion.id, originalRequest.criteria_values || {});
                            const currentVal = getValueLabel(criterion.id, values);
                            const changed = originalVal !== currentVal;
                            return (
                              <Box
                                component="tr"
                                key={criterion.id}
                                sx={{ bgcolor: changed ? 'warning.50' : 'transparent' }}
                              >
                                <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                                  <Typography variant="body2">{criterion.name}</Typography>
                                </Box>
                                <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                                  <Typography variant="body2" color="text.secondary">{originalVal}</Typography>
                                </Box>
                                <Box component="td" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: changed ? 600 : 400, color: changed ? 'warning.dark' : 'inherit' }}
                                  >
                                    {currentVal}
                                  </Typography>
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      </Box>
                    </Box>

                    {originalRequest.priority_override && originalRequest.override_justification && (
                      <Box sx={{ p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">Override Justification:</Typography>
                        <Typography variant="body2">{originalRequest.override_justification}</Typography>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Unable to load original request scoring.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </Stack>
    );
  },
);

export default ProjectScoringEditor;
