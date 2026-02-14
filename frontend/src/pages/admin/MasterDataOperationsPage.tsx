import React from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

const cards = [
  {
    title: 'Freeze / Unfreeze Data',
    description: 'Lock or unlock master data metrics for a specific year',
    to: '/master-data/operations/freeze',
  },
  {
    title: 'Master Data Copy',
    description: 'Copy company and department metrics between fiscal years',
    to: '/master-data/operations/copy',
  },
];

export default function MasterDataOperationsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Master Data Operations" />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Administrative tools to manage company and department metrics across years.
      </Typography>
      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.to} item xs={12} sm={6} md={4} lg={3}>
            <Card variant="outlined">
              <CardActionArea onClick={() => navigate(card.to)}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{card.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {card.description}
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
