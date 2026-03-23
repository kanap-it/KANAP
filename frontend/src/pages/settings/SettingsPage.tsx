import { Box, Tab, Tabs } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/PageHeader';
import ProfileTab from './ProfileTab';
import NotificationsTab from './NotificationsTab';
import AppearanceTab from './AppearanceTab';

const tabSlugs = ['profile', 'notifications', 'appearance'] as const;

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('settings');
  const activeTab = Math.max(0, tabSlugs.indexOf(tab as any));

  const handleTabChange = (_: unknown, index: number) => {
    navigate(`/settings/${tabSlugs[index]}`, { replace: true });
  };

  return (
    <>
      <PageHeader title={t('pageTitle')} />

      <Box sx={{ p: 3, maxWidth: 900 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label={t('tabs.profile')} />
          <Tab label={t('tabs.notifications')} />
          <Tab label={t('tabs.appearance')} />
        </Tabs>

        {activeTab === 0 && <ProfileTab />}
        {activeTab === 1 && <NotificationsTab />}
        {activeTab === 2 && <AppearanceTab />}
      </Box>
    </>
  );
}
