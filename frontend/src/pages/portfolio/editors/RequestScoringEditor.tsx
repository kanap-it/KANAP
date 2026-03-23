import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Alert, Box, Checkbox, FormControlLabel, Slider, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography, Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';

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
  requestId: string;
  criteriaValues: Record<string, string>;
  priorityScore: number | null;
  priorityOverride: boolean;
  overrideValue: number | null;
  overrideJustification: string | null;
  mandatoryBypassEnabled?: boolean;
  readOnly?: boolean;
  onScoreChange?: (newScore: number | null) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export type RequestScoringEditorHandle = {
  isDirty: () => boolean;
  save: () => Promise<number | null>;
  reset: () => void;
};

export const RequestScoringEditor = forwardRef<RequestScoringEditorHandle, Props>(
  function RequestScoringEditor(
    {
      requestId,
      criteriaValues: initialValues,
      priorityScore,
      priorityOverride: initialOverride,
      overrideValue: initialOverrideValue,
      overrideJustification: initialJustification,
      mandatoryBypassEnabled = false,
      readOnly,
      onScoreChange,
      onDirtyChange,
    },
    ref,
  ) {
    const { t } = useTranslation(['portfolio', 'errors']);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [values, setValues] = useState<Record<string, string>>(initialValues || {});
    const [override, setOverride] = useState(initialOverride);
    const [overrideVal, setOverrideVal] = useState(initialOverrideValue ?? 50);
    const [justification, setJustification] = useState(initialJustification || '');
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [bypassActive, setBypassActive] = useState(false);
    const [calculatedScore, setCalculatedScore] = useState<number | null>(priorityScore);

    // Skip one prop sync cycle after save (prevents flicker before refetch completes)
    const skipNextPropSync = useRef(false);

    // Load criteria once on mount
    useEffect(() => {
      const load = async () => {
        try {
          const res = await api.get('/portfolio/criteria');
          const enabledCriteria = (res.data || []).filter((c: Criterion) => c.enabled);
          setCriteria(enabledCriteria);
        } catch (e: any) {
          setError(getApiErrorMessage(e, t, t('editors.scoring.messages.loadCriteriaFailed')));
        }
      };
      load();
    }, [t]);

    // Only sync from props on INITIAL load (not when dirty)
    useEffect(() => {
      // Skip one sync after save to prevent flicker (refetch brings new props next)
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

    // Client-side score calculation for live preview
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

    // Recalculate when criteria load
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

      // Live score calculation
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

    // IMPORTANT: This imperative handle is recreated whenever state changes
    // so the parent always gets a save() function with current values
    useImperativeHandle(ref, () => ({
      isDirty: () => dirty,
      save: async (): Promise<number | null> => {
        setError(null);
        try {
          // Save criteria values - uses current state directly (not refs!)
          const res = await api.post(`/portfolio/criteria/requests/${requestId}/score`, {
            criteria_values: values,
          });

          const newScore = res.data?.priority_score;
          setCalculatedScore(newScore);
          onScoreChange?.(newScore);

          // Save override if enabled
          let finalScore = newScore;
          if (override) {
            await api.post(`/portfolio/criteria/requests/${requestId}/override`, {
              enabled: true,
              value: overrideVal,
              justification: justification,
            });
            finalScore = overrideVal;
          } else if (initialOverride && !override) {
            await api.post(`/portfolio/criteria/requests/${requestId}/override`, {
              enabled: false,
            });
          }

          // Skip next prop sync to prevent flicker (wait for refetch with new data)
          skipNextPropSync.current = true;
          setDirty(false);
          onDirtyChange?.(false);

          return finalScore;
        } catch (e: any) {
          setError(getApiErrorMessage(e, t, t('editors.scoring.messages.saveFailed')));
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
    }), [dirty, values, override, overrideVal, justification, requestId, initialOverride, initialValues, initialOverrideValue, initialJustification, onScoreChange, onDirtyChange, t]);

    // Calculate display score directly from current state (avoids stale calculatedScore issues)
    const liveScore = bypassActive ? 100 : calculateLocalScore(criteria, values);
    const displayScore = override && !bypassActive ? overrideVal : liveScore;

    return (
      <Stack spacing={3}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* Score Display */}
        <Box
          sx={{
            textAlign: 'center',
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h2" fontWeight="bold">
            {displayScore != null && !isNaN(displayScore) ? Math.round(displayScore) : '-'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('editors.scoring.labels.priorityScore')}
            {bypassActive && ` ${t('editors.scoring.labels.mandatoryBypassSuffix')}`}
            {override && !bypassActive && ` ${t('editors.scoring.labels.overrideSuffix')}`}
          </Typography>
        </Box>

        <Divider />

        {/* Criteria Evaluation */}
        <Typography variant="h6">{t('editors.scoring.sections.evaluationCriteria')}</Typography>

        {criteria.length === 0 && (
          <Alert severity="info">{t('editors.scoring.states.noCriteria')}</Alert>
        )}

        {criteria.map((criterion) => (
          <Box key={criterion.id}>
            <Typography variant="subtitle2" gutterBottom>
              {criterion.name}
              {criterion.weight !== 1 && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {t('editors.scoring.values.weight', { weight: criterion.weight })}
                </Typography>
              )}
              {criterion.inverted && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  {t('editors.scoring.values.inverted')}
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
            label={t('editors.scoring.fields.enablePriorityOverride')}
          />
          {bypassActive && (
            <Typography variant="caption" color="text.secondary" display="block">
              {t('editors.scoring.messages.overrideDisabled')}
            </Typography>
          )}
        </Box>

        {override && !bypassActive && (
          <Stack spacing={2}>
            <Box>
              <Typography gutterBottom>
                {t('editors.scoring.fields.overrideValue', { value: overrideVal })}
              </Typography>
              <Slider
                value={overrideVal}
                onChange={(_, val) => handleOverrideValChange(val as number)}
                min={0}
                max={100}
                disabled={readOnly}
              />
            </Box>
            <TextField
              label={t('editors.scoring.fields.justification')}
              value={justification}
              onChange={(e) => handleJustificationChange(e.target.value)}
              multiline
              rows={2}
              required
              disabled={readOnly}
              fullWidth
              helperText={t('editors.scoring.helper.justification')}
            />
          </Stack>
        )}
      </Stack>
    );
  },
);

export default RequestScoringEditor;
