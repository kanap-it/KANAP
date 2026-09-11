import React from 'react';
import { Autocomplete, Box, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { KanapDialog, PropertyRow } from '../../../components/design';
import { drawerAutocompleteListboxSx, drawerFieldValueSx } from '../../../theme/formSx';
import SkillLevelControl, { clampSkillLevel } from './SkillLevelControl';
import type { SkillOption } from './ContributorSkillsTab';

type Props = {
  open: boolean;
  /** Catalog skills not yet on the profile, already sorted by category then name. */
  options: SkillOption[];
  onClose: () => void;
  onAdd: (skillId: string, level: number) => void;
};

const DEFAULT_LEVEL = 2;

/**
 * Pick a skill and its level in one go, so a long list never has to be
 * scrolled afterwards just to adjust the level of the row that was added.
 */
export default function AddSkillDialog({ open, options, onClose, onAdd }: Props) {
  const { t } = useTranslation(['portfolio', 'common']);
  const [skill, setSkill] = React.useState<SkillOption | null>(null);
  const [level, setLevel] = React.useState(DEFAULT_LEVEL);

  const levelLabels = React.useMemo<Record<number, string>>(() => ({
    1: t('portfolio:workspace.contributor.proficiency.1'),
    2: t('portfolio:workspace.contributor.proficiency.2'),
    3: t('portfolio:workspace.contributor.proficiency.3'),
    4: t('portfolio:workspace.contributor.proficiency.4'),
  }), [t]);

  React.useEffect(() => {
    if (open) {
      setSkill(null);
      setLevel(DEFAULT_LEVEL);
    }
  }, [open]);

  const handleSave = () => {
    if (!skill) return;
    onAdd(skill.id, clampSkillLevel(level));
    onClose();
  };

  return (
    <KanapDialog
      open={open}
      title={t('portfolio:workspace.contributor.addSkillDialog.title')}
      onClose={onClose}
      onSave={handleSave}
      saveLabel={t('common:buttons.add')}
      saveDisabled={!skill}
    >
      <PropertyRow label={t('portfolio:workspace.contributor.addSkillDialog.skill')} valueSx={{ maxWidth: 'none' }}>
        <Autocomplete
          options={options}
          groupBy={(option) => option.category}
          getOptionLabel={(option) => option.name}
          value={skill}
          onChange={(_, option) => setSkill(option)}
          openOnFocus
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
      <PropertyRow label={t('portfolio:workspace.contributor.addSkillDialog.level')}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 32 }}>
          <SkillLevelControl
            ariaLabel={t('portfolio:workspace.contributor.addSkillDialog.level')}
            labels={levelLabels}
            optionLabel={(value, label) => t('portfolio:workspace.contributor.aria.levelOption', { level: value, label })}
            value={level}
            onChange={setLevel}
          />
          <Box component="span" sx={(theme) => ({ fontSize: 13, color: theme.palette.kanap.text.secondary })}>
            {levelLabels[level]}
          </Box>
        </Box>
      </PropertyRow>
    </KanapDialog>
  );
}
