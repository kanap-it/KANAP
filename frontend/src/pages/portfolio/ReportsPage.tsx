import { Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import ClassificationGapsStrip, { ClassificationGaps } from './components/ClassificationGapsStrip';
import SteeringStrip from './components/SteeringStrip';

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
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        {t('reports.subtitle')}
      </Typography>
      <SteeringStrip />
      <ClassificationGapsStrip data={gaps} />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/status-change')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{t('reports.cards.statusChange.title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('reports.cards.statusChange.description')}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/capacity-heatmap')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{t('reports.cards.capacityHeatmap.title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('reports.cards.capacityHeatmap.description')}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/weekly')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>{t('reports.cards.weekly.title')}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('reports.cards.weekly.description')}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
