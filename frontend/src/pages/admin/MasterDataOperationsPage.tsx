import React from 'react';
import { Grid, Card, CardContent, CardActionArea, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';

export default function MasterDataOperationsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin']);
  const cards = [
    {
      title: t('masterDataOperations.cards.freeze.title'),
      description: t('masterDataOperations.cards.freeze.description'),
      to: '/master-data/operations/freeze',
    },
    {
      title: t('masterDataOperations.cards.copy.title'),
      description: t('masterDataOperations.cards.copy.description'),
      to: '/master-data/operations/copy',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title={t('masterDataOperations.title')} />
      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
        {t('masterDataOperations.subtitle')}
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
