import React from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

const cards = [
  {
    title: 'Companies',
    description: 'Manage company entities and their metrics',
    to: '/master-data/companies',
  },
  {
    title: 'Departments',
    description: 'Manage departments across companies',
    to: '/master-data/departments',
  },
  {
    title: 'Suppliers',
    description: 'Manage supplier information',
    to: '/master-data/suppliers',
  },
  {
    title: 'Accounts',
    description: 'Manage chart of accounts',
    to: '/master-data/accounts',
  },
  {
    title: 'Currency',
    description: 'Configure reporting and default currencies',
    to: '/master-data/currency',
  },
  {
    title: 'Business Processes',
    description: 'Manage core ISO 9001-style business processes',
    to: '/master-data/business-processes',
  },
  {
    title: 'Analytics Dimensions',
    description: 'Configure analytics dimensions',
    to: '/master-data/analytics',
  },
  {
    title: 'Administration',
    description: 'Freeze, copy, and manage master data across years',
    to: '/master-data/operations',
  },
];

export default function MasterDataHomePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Master Data" />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        Manage organizational structure, suppliers, accounts, and analytics categories.
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
