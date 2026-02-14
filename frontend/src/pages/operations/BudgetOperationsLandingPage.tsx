import React from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

type OperationCard = {
  title: string;
  description: string;
  to: string;
};

const cards: OperationCard[] = [
  {
    title: 'Freeze / Unfreeze Data',
    description: 'Lock budget columns or headcount metrics for a specific year',
    to: '/ops/operations/freeze'
  },
  {
    title: 'Copy Budget Columns',
    description: 'Copy budget data between years and columns with optional percentage adjustments',
    to: '/ops/operations/copy-budget-columns'
  },
  {
    title: 'Copy Allocations',
    description: 'Copy allocation methods and percentages from one year to another',
    to: '/ops/operations/copy-allocations'
  },
  {
    title: 'Reset Budget Column',
    description: 'Clear all data from a budget column for a specific year',
    to: '/ops/operations/column-reset'
  },
];

export default function BudgetOperationsLandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Budget Operations" />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Powerful tools to manage and transform your budget data across different years and columns.
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
