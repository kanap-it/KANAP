import { Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useTranslation } from 'react-i18next';

export default function ReportsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation('portfolio');
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title={t('reports.title')} />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        {t('reports.subtitle')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/status-change')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('reports.cards.statusChange.title')}</Typography>
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
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('reports.cards.capacityHeatmap.title')}</Typography>
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
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{t('reports.cards.weekly.title')}</Typography>
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
