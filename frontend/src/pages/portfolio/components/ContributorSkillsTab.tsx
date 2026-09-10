import React from 'react';
import { Autocomplete, Box, IconButton, TextField } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { PropertyRow } from '../../../components/design';
import { drawerAutocompleteListboxSx, drawerFieldValueSx } from '../../../theme/formSx';
import { taskDetailTypography } from '../../tasks/theme/taskDetailTokens';
import { useLocalStorageState } from '../../../hooks/useLocalStorageState';
import SkillLevelControl, { clampSkillLevel, SKILL_LEVELS } from './SkillLevelControl';

export interface SkillOption {
  id: string;
  category: string;
  name: string;
  enabled: boolean;
}

export interface SkillProficiency {
  skill_id: string;
  proficiency: number;
}

type Props = {
  allSkills: SkillOption[];
  selectedSkills: SkillProficiency[];
  canEdit: boolean;
  onAdd: (skillId: string) => void;
  onRemove: (skillId: string) => void;
  onLevelChange: (skillId: string, level: number) => void;
};

type SkillRow = { skill: SkillOption; proficiency: number };
type SkillsGroupBy = 'category' | 'level';
const GROUP_BY_STORAGE_KEY = 'kanap.contributors.skillsGroupBy';

export default function ContributorSkillsTab({
  allSkills,
  selectedSkills,
  canEdit,
  onAdd,
  onRemove,
  onLevelChange,
}: Props) {
  const { t } = useTranslation(['portfolio', 'common']);

  const levelLabels = React.useMemo<Record<number, string>>(() => ({
    1: t('portfolio:workspace.contributor.proficiency.1'),
    2: t('portfolio:workspace.contributor.proficiency.2'),
    3: t('portfolio:workspace.contributor.proficiency.3'),
    4: t('portfolio:workspace.contributor.proficiency.4'),
  }), [t]);

  const skillsById = React.useMemo(() => new Map(allSkills.map((skill) => [skill.id, skill])), [allSkills]);

  const availableSkills = React.useMemo(() => {
    const selectedIds = new Set(selectedSkills.map((s) => s.skill_id));
    return allSkills
      .filter((skill) => skill.enabled && !selectedIds.has(skill.id))
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }, [allSkills, selectedSkills]);

  const [groupBy, setGroupBy] = useLocalStorageState<SkillsGroupBy>(GROUP_BY_STORAGE_KEY, 'category');

  const rows = React.useMemo<SkillRow[]>(() => selectedSkills.flatMap((sp) => {
    const skill = skillsById.get(sp.skill_id);
    return skill ? [{ skill, proficiency: clampSkillLevel(sp.proficiency) }] : [];
  }), [selectedSkills, skillsById]);

  // Either one section per category (alphabetical), or one per level from
  // expert down, so a reader sees at a glance what this person masters.
  const sections = React.useMemo(() => {
    const byName = (a: SkillRow, b: SkillRow) => a.skill.name.localeCompare(b.skill.name);
    if (groupBy === 'level') {
      return [...SKILL_LEVELS].reverse().flatMap((level) => {
        const levelRows = rows.filter((row) => row.proficiency === level);
        if (levelRows.length === 0) return [];
        return [{
          key: `level-${level}`,
          title: levelLabels[level],
          rows: levelRows.sort((a, b) => a.skill.category.localeCompare(b.skill.category) || byName(a, b)),
        }];
      });
    }
    const byCategory = new Map<string, SkillRow[]>();
    for (const row of rows) {
      byCategory.set(row.skill.category, [...(byCategory.get(row.skill.category) ?? []), row]);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, categoryRows]) => ({ key: category, title: category, rows: categoryRows.sort(byName) }));
  }, [groupBy, levelLabels, rows]);

  const optionLabel = React.useCallback(
    (level: number, label: string) => t('portfolio:workspace.contributor.aria.levelOption', { level, label }),
    [t],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {canEdit && (
        <PropertyRow label={t('portfolio:workspace.contributor.sections.addSkill')} valueSx={{ maxWidth: 420 }}>
          <Autocomplete
            options={availableSkills}
            groupBy={(option) => option.category}
            getOptionLabel={(option) => option.name}
            value={null}
            onChange={(_, option) => { if (option) onAdd(option.id); }}
            blurOnSelect
            ListboxProps={{ sx: drawerAutocompleteListboxSx }}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                placeholder={t('portfolio:workspace.contributor.placeholders.searchSkills')}
                sx={drawerFieldValueSx}
              />
            )}
            fullWidth
          />
        </PropertyRow>
      )}

      {sections.length === 0 && (
        <Box sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.tertiary })}>
          {t('portfolio:workspace.contributor.states.noSkills')}
        </Box>
      )}

      {rows.length > 0 && (
        <Box sx={(theme) => ({ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 12, color: theme.palette.kanap.text.tertiary })}>
          <span>{t('portfolio:workspace.contributor.groupBy.label')}</span>
          {(['category', 'level'] as const).map((option) => (
            <Box
              key={option}
              component="button"
              type="button"
              aria-pressed={groupBy === option}
              onClick={() => setGroupBy(option)}
              sx={(theme) => ({
                border: 0,
                p: 0,
                bgcolor: 'transparent',
                font: 'inherit',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: groupBy === option ? 500 : 400,
                color: groupBy === option ? theme.palette.kanap.text.primary : theme.palette.kanap.text.tertiary,
                '&:hover': { color: theme.palette.kanap.text.primary },
              })}
            >
              {t(`portfolio:workspace.contributor.groupBy.${option}`)}
            </Box>
          ))}
        </Box>
      )}

      {sections.map(({ key, title, rows: sectionRows }) => (
        <Box key={key}>
          <Box
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              mb: '6px',
              fontSize: 13,
              fontWeight: 500,
              color: theme.palette.kanap.text.primary,
            })}
          >
            <span>{title}</span>
            <Box component="span" sx={(theme) => ({ ...taskDetailTypography.metaChip, color: theme.palette.kanap.text.tertiary })}>
              {t('portfolio:workspace.contributor.values.skillCount', { count: sectionRows.length })}
            </Box>
          </Box>
          <Box
            sx={{
              display: 'grid',
              // Two readable columns on a wide tab: the name keeps ~250px next
              // to the 120px pip row, and the block never outgrows the General tab.
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(380px, 100%), 1fr))',
              maxWidth: 900,
              columnGap: '32px',
              rowGap: '2px',
            }}
          >
            {sectionRows.map(({ skill, proficiency }) => (
              <Box
                key={skill.id}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  minHeight: 30,
                  pl: '6px',
                  pr: '2px',
                  borderRadius: '5px',
                  '&:hover, &:focus-within': { bgcolor: theme.palette.kanap.bg.hover },
                  '& .skill-remove': { opacity: 0 },
                  '&:hover .skill-remove, &:focus-within .skill-remove': { opacity: 1 },
                })}
              >
                <Box
                  component="span"
                  sx={(theme) => ({
                    flex: '1 1 0',
                    minWidth: 0,
                    fontSize: 13,
                    color: theme.palette.kanap.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {skill.name}
                </Box>
                <SkillLevelControl
                  ariaLabel={t('portfolio:workspace.contributor.aria.skillLevel', { skill: skill.name })}
                  labels={levelLabels}
                  optionLabel={optionLabel}
                  value={proficiency}
                  onChange={canEdit ? (level) => onLevelChange(skill.id, level) : undefined}
                  disabled={!canEdit}
                />
                {canEdit ? (
                  <IconButton
                    className="skill-remove"
                    size="small"
                    aria-label={t('portfolio:workspace.contributor.aria.removeSkill', { skill: skill.name })}
                    onClick={() => onRemove(skill.id)}
                    sx={(theme) => ({
                      p: '3px',
                      color: theme.palette.kanap.text.tertiary,
                      transition: 'opacity 120ms ease',
                      '&:hover': { color: theme.palette.kanap.danger },
                    })}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                ) : (
                  <Box sx={{ width: 22 }} />
                )}
              </Box>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
