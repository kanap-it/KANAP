import React from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

type ReportCard = {
  title: string;
  description: string;
  to: string;
};

const cards: ReportCard[] = [
  { title: 'Global Chargeback', description: 'Global allocations, company totals, and KPIs', to: '/ops/reports/chargeback/global' },
  { title: 'Company Chargeback', description: 'Zoom into a single company with department totals and items', to: '/ops/reports/chargeback/company' },
  { title: 'Top OPEX', description: 'Largest OPEX items for a selected year (custom top N)', to: '/ops/reports/top-opex' },
  { title: 'Top OPEX Increase/Decrease', description: 'Biggest changes vs previous year (custom top N)', to: '/ops/reports/opex-delta' },
  { title: 'Budget Trend (OPEX)', description: 'Compare OPEX metrics across years', to: '/ops/reports/comparison' },
  { title: 'Budget Trend (CAPEX)', description: 'Compare CAPEX metrics across years', to: '/ops/reports/capex/trend' },
  { title: 'Budget Column Comparison', description: 'Pick up to 10 year+column totals (OPEX or CAPEX)', to: '/ops/reports/budget-columns-compare' },
  { title: 'Consolidation Accounts', description: 'Budget grouped by consolidation account (pie or line)', to: '/ops/reports/consolidation' },
  { title: 'Analytics Categories', description: 'Budget grouped by analytics category (pie or line)', to: '/ops/reports/analytics' },
];

export default function ReportsLandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Reporting" />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Explore prebuilt reports. Each report includes a summary table and a chart, with export options.
      </Typography>
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.to} item xs={12} sm={6} md={4} lg={3}>
            <Card variant="outlined">
              <CardActionArea onClick={() => navigate(c.to)}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{c.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {c.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
