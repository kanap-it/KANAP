import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TaskComments from './TaskComments';
import TaskHistory from './TaskHistory';
import TaskWorkLog from './TaskWorkLog';
import type { TaskStatus } from '../task.constants';

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
  const supportsTimeLogging = !TIME_LOGGING_EXCLUDED_TYPES.includes(relatedObjectType || '');
  const [activeTab, setActiveTab] = React.useState<ActivityTab>('comments');

  React.useEffect(() => {
    if (commentFocusNonce < 1) return;
    setActiveTab('comments');
  }, [commentFocusNonce]);

  const handleTabChange = (_: React.MouseEvent<HTMLElement>, newTab: ActivityTab | null) => {
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
          Activity
        </Typography>
        <ToggleButtonGroup
          value={activeTab}
          exclusive
          onChange={handleTabChange}
          size="small"
        >
          <ToggleButton value="comments">
            <CommentIcon fontSize="small" sx={{ mr: 0.5 }} />
            Comments
          </ToggleButton>
          <ToggleButton value="history">
            <HistoryIcon fontSize="small" sx={{ mr: 0.5 }} />
            History
          </ToggleButton>
          {supportsTimeLogging && (
            <ToggleButton value="worklog">
              <AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />
              Time Log
            </ToggleButton>
          )}
        </ToggleButtonGroup>
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
