import React from 'react';
import {
  Box,
  Tab,
  Tabs,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import TaskComments from './TaskComments';
import TaskHistory from './TaskHistory';
import TaskWorkLog from './TaskWorkLog';
import type { TaskStatus } from '../task.constants';
import { taskDetailTokens } from '../theme/taskDetailTokens';

type ActivityTab = 'comments' | 'history' | 'worklog';

interface TaskActivityProps {
  taskId: string;
  projectId?: string;
  readOnly?: boolean;
  relatedObjectType?: string;
  currentStatus: TaskStatus;
  totalTimeHours?: number;
  initialStatus?: TaskStatus | null;
  commentFocusNonce?: number;
}

// Task types that don't support time logging
const TIME_LOGGING_EXCLUDED_TYPES = ['contract', 'spend_item', 'capex_item'];

export default function TaskActivity({
  taskId,
  projectId,
  readOnly = false,
  relatedObjectType,
  currentStatus,
  totalTimeHours = 0,
  initialStatus = null,
  commentFocusNonce = 0,
}: TaskActivityProps) {
  const { t } = useTranslation('portfolio');
  const supportsTimeLogging = !TIME_LOGGING_EXCLUDED_TYPES.includes(relatedObjectType || '');
  const [activeTab, setActiveTab] = React.useState<ActivityTab>('comments');

  React.useEffect(() => {
    if (commentFocusNonce < 1) return;
    setActiveTab('comments');
  }, [commentFocusNonce]);

  return (
    <Box>
      {/* Activity tabs (no label — tabs serve as section title) */}
      <Box sx={{ mb: taskDetailTokens.activityHead.mb }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ minHeight: 'auto', '& .MuiTabs-indicator': { display: 'none' } }}
        >
          <Tab
            label={t('activity.tabs.comments')}
            value="comments"
            sx={(theme) => ({
              minHeight: 'auto', p: 0, mr: 2, textTransform: 'none', minWidth: 'auto',
              fontSize: '13px',
              fontWeight: activeTab === 'comments' ? 500 : 400,
              color: activeTab === 'comments' ? theme.palette.kanap.text.primary : theme.palette.kanap.text.tertiary,
            })}
          />
          <Tab
            label={t('activity.tabs.history')}
            value="history"
            sx={(theme) => ({
              minHeight: 'auto', p: 0, mr: 2, textTransform: 'none', minWidth: 'auto',
              fontSize: '13px',
              fontWeight: activeTab === 'history' ? 500 : 400,
              color: activeTab === 'history' ? theme.palette.kanap.text.primary : theme.palette.kanap.text.tertiary,
            })}
          />
          {supportsTimeLogging && (
            <Tab
              label={t('activity.tabs.workLog')}
              value="worklog"
              sx={(theme) => ({
                minHeight: 'auto', p: 0, textTransform: 'none', minWidth: 'auto',
                fontSize: '13px',
                fontWeight: activeTab === 'worklog' ? 500 : 400,
                color: activeTab === 'worklog' ? theme.palette.kanap.text.primary : theme.palette.kanap.text.tertiary,
              })}
            />
          )}
        </Tabs>
      </Box>

      <Box sx={{ minHeight: 200 }}>
        {activeTab === 'comments' && (
          <TaskComments
            taskId={taskId}
            projectId={projectId}
            readOnly={readOnly}
            relatedObjectType={relatedObjectType}
            currentStatus={currentStatus}
            totalTimeHours={totalTimeHours}
            initialStatus={initialStatus}
            commentFocusNonce={commentFocusNonce}
          />
        )}
        {activeTab === 'history' && (
          <TaskHistory taskId={taskId} projectId={projectId} />
        )}
        {activeTab === 'worklog' && supportsTimeLogging && (
          <TaskWorkLog taskId={taskId} projectId={projectId} readOnly={readOnly} relatedObjectType={relatedObjectType} />
        )}
      </Box>
    </Box>
  );
}
