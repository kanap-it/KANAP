import { Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import ClassificationGapsStrip, { ClassificationGaps } from './components/ClassificationGapsStrip';
import SteeringStrip from './components/SteeringStrip';

/**
 * Charter card: 8px radius, 1px border, no shadow at rest, a subtle lift on hover,
 * 16px padding, 160ms transition.
 */
const reportCardSx: SxProps<Theme> = {
  height: '100%',
  bgcolor: 'kanap.bg.primary',
  borderColor: 'kanap.border.default',
  borderRadius: '8px',
  boxShadow: 'none',
  transition: 'box-shadow 160ms ease, transform 160ms ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: (theme) =>
      theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.05)',
  },
};

function ReportCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <Card variant="outlined" sx={reportCardSx}>
      <CardActionArea
        onClick={onClick}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}
      >
        <CardContent sx={{ p: 2 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: 'kanap.text.primary' }}>{title}</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
            {description}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('portfolio');
  const { data: gaps } = useQuery({
    queryKey: ['portfolio-classification-gaps'],
    queryFn: async () => (await api.get<ClassificationGaps>('/portfolio/reports/classification-gaps')).data,
    staleTime: 2 * 60 * 1000,
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title={t('reports.title')} />
      <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
        {t('reports.subtitle')}
      </Typography>
      <SteeringStrip />
      <ClassificationGapsStrip data={gaps} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <ReportCard
            title={t('reports.cards.statusChange.title')}
            description={t('reports.cards.statusChange.description')}
            onClick={() => navigate('/portfolio/reports/status-change')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <ReportCard
            title={t('reports.cards.capacityHeatmap.title')}
            description={t('reports.cards.capacityHeatmap.description')}
            onClick={() => navigate('/portfolio/reports/capacity-heatmap')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <ReportCard
            title={t('reports.cards.weekly.title')}
            description={t('reports.cards.weekly.description')}
            onClick={() => navigate('/portfolio/reports/weekly')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <ReportCard
            title={t('reports.cards.flow.title')}
            description={t('reports.cards.flow.description')}
            onClick={() => navigate('/portfolio/reports/flow')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <ReportCard
            title={t('reports.cards.byAssignee.title')}
            description={t('reports.cards.byAssignee.description')}
            onClick={() => navigate('/portfolio/reports/by-assignee')}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
