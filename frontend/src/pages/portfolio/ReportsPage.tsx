import { Box, Card, CardActionArea, CardContent, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

export default function ReportsPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Portfolio Reporting" />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Explore portfolio reports focused on capacity, workload, and portfolio status trends.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/status-change')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Status Change Report</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Track standalone tasks, requests, and projects with status changes over a period.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card variant="outlined">
            <CardActionArea onClick={() => navigate('/portfolio/reports/capacity-heatmap')}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Capacity Heatmap</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Visualize expected workload vs capacity for contributors and teams.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
