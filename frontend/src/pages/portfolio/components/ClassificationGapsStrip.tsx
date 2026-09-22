import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { BLANK, FilterModel, projectsPath, requestsPath, tasksPath } from './portfolioListLinks';

export type GapCounts = {
  open: number;
  anyGap: number;
  source: number;
  category: number;
  stream: number;
};

export type ClassificationGaps = {
  tasks: GapCounts & { taskType: number };
  requests: GapCounts;
  projects: GapCounts;
  categoriesWithStreams: string[];
};

/**
 * A missing stream is only counted for items whose category actually offers one, so the link
 * narrows the list to those categories before asking for an empty stream.
 */
const streamFilter = (categories: string[]): FilterModel => ({
  category_name: { filterType: 'set', values: categories },
  stream_name: BLANK,
});

type Figure = { key: string; count: number; label: string; to: string | null };

function buildRows(data: ClassificationGaps, t: (key: string, opts?: any) => string) {
  const cats = data.categoriesWithStreams;
  // With no category offering a stream the count is always zero and there is nothing to open.
  const streamTo = (path: (extra: FilterModel) => string) => (cats.length > 0 ? path(streamFilter(cats)) : null);

  const figures = (counts: GapCounts, path: (extra: FilterModel) => string): Figure[] => [
    { key: 'source', count: counts.source, label: t('reports.toClassify.source', { n: counts.source }), to: path({ source_name: BLANK }) },
    { key: 'category', count: counts.category, label: t('reports.toClassify.category', { n: counts.category }), to: path({ category_name: BLANK }) },
    { key: 'stream', count: counts.stream, label: t('reports.toClassify.stream', { n: counts.stream }), to: streamTo(path) },
  ];

  return [
    {
      key: 'tasks',
      label: t('reports.toClassify.entities.tasks'),
      anyGap: data.tasks.anyGap,
      figures: [
        ...figures(data.tasks, tasksPath),
        { key: 'taskType', count: data.tasks.taskType, label: t('reports.toClassify.taskType', { n: data.tasks.taskType }), to: tasksPath({ task_type_name: BLANK }) },
      ],
    },
    { key: 'requests', label: t('reports.toClassify.entities.requests'), anyGap: data.requests.anyGap, figures: figures(data.requests, requestsPath) },
    { key: 'projects', label: t('reports.toClassify.entities.projects'), anyGap: data.projects.anyGap, figures: figures(data.projects, projectsPath) },
  ].filter((row) => row.anyGap > 0);
}

/**
 * Compact strip above the report cards: how many open tasks, requests and projects still miss
 * a classification value. Each non-zero figure opens the matching list already filtered on the
 * same population, so the gap can be closed straight away.
 */
export default function ClassificationGapsStrip({ data }: { data: ClassificationGaps | undefined }) {
  const { t } = useTranslation('portfolio');
  if (!data) return null;
  const rows = buildRows(data, t);

  return (
    <Box sx={{ bgcolor: 'kanap.bg.drawer', border: '1px solid', borderColor: 'kanap.border.soft', borderRadius: '8px', px: 2, py: 1.25 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary', mb: 0.75 }}>
        {t('reports.toClassify.title')}
      </Typography>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
          {t('reports.toClassify.allClassified')}
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {rows.map((row) => (
            <Stack key={row.key} direction="row" spacing={1.5} alignItems="baseline" flexWrap="wrap">
              <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary', minWidth: 76 }}>{row.label}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1, rowGap: 0.25 }}>
                {row.figures.map((figure, index) => [
                  index > 0 ? (
                    <Typography key={`${figure.key}-sep`} aria-hidden sx={{ fontSize: 13, color: 'kanap.text.tertiary' }}>·</Typography>
                  ) : null,
                  figure.count > 0 && figure.to ? (
                    <Typography
                      key={figure.key}
                      component={RouterLink}
                      to={figure.to}
                      sx={{ fontSize: 13, fontWeight: 400, color: 'warning.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {figure.label}
                    </Typography>
                  ) : (
                    // A zero still has to be readable: secondary ink, not tertiary, which
                    // falls under the readable contrast on the dark strip surface.
                    <Typography key={figure.key} sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>{figure.label}</Typography>
                  ),
                ])}
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
