import React, { useMemo } from 'react';
import { Autocomplete, Checkbox, ListItemText, MenuItem, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { drawerAutocompleteListboxSx, drawerMenuItemSx } from '../../theme/formSx';
import { ReportFilter, reportFilterMenuProps, reportFilterSelectSx } from './ReportLayout';

export type ReportFilterProject = { id: string; ref: string; name: string; status: string };
export type ReportFilterTeam = { id: string; name: string };
export type ReportFilterValues = { projects: ReportFilterProject[]; teams: ReportFilterTeam[] };

/** A project no longer in play: listed after the open ones, and read in a quieter tone. */
const CLOSED_PROJECT_STATUSES = new Set(['done', 'cancelled']);
const closedRank = (status: string) => (status === 'cancelled' ? 2 : status === 'done' ? 1 : 0);

/**
 * The projects and teams a portfolio report can be narrowed to. They come from the reports'
 * own endpoint, under the reports' permission: a report reader may see neither the project
 * list nor the team settings. Projects arrive open first, then done, then cancelled.
 */
export function useReportFilterValues() {
  return useQuery<ReportFilterValues>({
    queryKey: ['portfolio-report-filter-values'],
    queryFn: async () => (await api.get<ReportFilterValues>('/portfolio/reports/filter-values')).data,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * A comma-separated list of identifiers coming from another page's link. It is an initial
 * value: the user is free to change it, and the URL is never rewritten.
 */
export const idsFromParams = (params: URLSearchParams, key: string): string[] =>
  String(params.get(key) || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/** The identifiers a multi-select holds, as the endpoints and the report URLs take them. */
export const idsParam = (ids: string[], all = false): string | undefined =>
  all || ids.length === 0 ? undefined : ids.join(',');

export const projectOptionLabel = (project: ReportFilterProject): string =>
  project.ref ? `${project.ref} · ${project.name}` : project.name;

type FilterProps<TOption> = {
  options: TOption[];
  value: string[];
  onChange: (ids: string[]) => void;
};

/** Projects, searchable by reference or name. Nothing selected reads as every project. */
export function ProjectFilter({ options, value, onChange }: FilterProps<ReportFilterProject>) {
  const { t } = useTranslation('portfolio');
  // The endpoint already lists the open projects first; the order is kept here too, stable, so
  // a closed project never sits among the ones in play.
  const ordered = useMemo(
    () => [...options].sort((a, b) => closedRank(a.status) - closedRank(b.status)),
    [options],
  );
  const selected = useMemo(() => ordered.filter((option) => value.includes(option.id)), [ordered, value]);
  const summary =
    value.length === 0
      ? t('reports.weekly.filters.allProjects')
      : value.length === 1 && selected.length === 1
        ? projectOptionLabel(selected[0])
        : t('reports.weekly.filters.selectedCount', { count: value.length });

  return (
    <ReportFilter label={t('reports.weekly.filters.project')} width={260}>
      <Autocomplete
        multiple
        size="small"
        disableCloseOnSelect
        options={ordered}
        value={selected}
        onChange={(_, next) => onChange(next.map((option) => option.id))}
        getOptionLabel={projectOptionLabel}
        isOptionEqualToValue={(option, current) => option.id === current.id}
        noOptionsText={t('reports.weekly.filters.noProjectMatch')}
        ListboxProps={{ sx: drawerAutocompleteListboxSx }}
        renderOption={(props, option, { selected: isSelected }) => (
          <li {...props} key={option.id}>
            <Checkbox size="small" checked={isSelected} sx={{ mr: 1 }} />
            <ListItemText
              primary={projectOptionLabel(option)}
              primaryTypographyProps={{
                fontSize: 13,
                color: CLOSED_PROJECT_STATUSES.has(option.status) ? 'kanap.text.tertiary' : 'kanap.text.primary',
              }}
            />
          </li>
        )}
        renderTags={() => null}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={summary}
            inputProps={{ ...params.inputProps, 'aria-label': t('reports.weekly.filters.project') }}
            sx={{ '& input::placeholder': { color: 'kanap.text.primary', opacity: 1 }, '& input': { fontSize: 13 } }}
          />
        )}
        sx={{ width: '100%' }}
      />
    </ReportFilter>
  );
}

/** Teams, the same select as the source filter. Nothing selected reads as every team. */
export function TeamFilter({ options, value, onChange }: FilterProps<ReportFilterTeam>) {
  const { t } = useTranslation('portfolio');
  const names = useMemo(() => new Map(options.map((option) => [option.id, option.name])), [options]);

  return (
    <ReportFilter label={t('reports.weekly.filters.team')}>
      <TextField
        select
        size="small"
        value={value}
        SelectProps={{
          multiple: true,
          displayEmpty: true,
          MenuProps: reportFilterMenuProps,
          renderValue: () => {
            if (value.length === 0) return t('reports.weekly.filters.allTeams');
            if (value.length === 1 && names.has(value[0])) return names.get(value[0]);
            return t('reports.weekly.filters.selectedCount', { count: value.length });
          },
        }}
        onChange={(event) => {
          const next = event.target.value as unknown as string[] | string;
          onChange(Array.isArray(next) ? next : String(next).split(',').filter(Boolean));
        }}
        sx={reportFilterSelectSx}
      >
        {options.map((option) => (
          <MenuItem key={option.id} value={option.id} sx={drawerMenuItemSx}>
            <Checkbox size="small" checked={value.includes(option.id)} />
            <ListItemText primary={option.name} primaryTypographyProps={{ fontSize: 13 }} />
          </MenuItem>
        ))}
      </TextField>
    </ReportFilter>
  );
}
