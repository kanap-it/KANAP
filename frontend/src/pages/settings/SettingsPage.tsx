import { Box, Tab, Tabs } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ProfileTab from './ProfileTab';
import NotificationsTab from './NotificationsTab';

const tabSlugs = ['profile', 'notifications'] as const;

export default function SettingsPage() {
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();
  const activeTab = Math.max(0, tabSlugs.indexOf(tab as any));

  const handleTabChange = (_: unknown, index: number) => {
    navigate(`/settings/${tabSlugs[index]}`, { replace: true });
  };

  return (
    <>
      <PageHeader title="Settings" />

      <Box sx={{ p: 3, maxWidth: 900 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
          <Tab label="Profile" />
          <Tab label="Notifications" />
        </Tabs>

        {activeTab === 0 && <ProfileTab />}
        {activeTab === 1 && <NotificationsTab />}
      </Box>
    </>
  );
}
