import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CommentIcon from '@mui/icons-material/Comment';
import HistoryIcon from '@mui/icons-material/History';
import PortfolioComments from './PortfolioComments';
import PortfolioHistory from './PortfolioHistory';

type ActivityTab = 'comments' | 'history';

interface Activity {
  id: string;
  type: 'comment' | 'change' | 'decision';
  content: string | null;
  context: string | null;
  decision_outcome: string | null;
  changed_fields?: Record<string, [unknown, unknown]>;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface PortfolioActivityProps {
  entityType: 'request' | 'project';
  entityId: string;
  activities: Activity[];
  currentStatus: string;
  allowedTransitions: string[];
  statusOptions: Array<{ value: string; label: string }>;
  onAddComment: (data: {
    content: string;
    context: string | null;
    is_decision: boolean;
    decision_outcome?: string;
    new_status?: string;
  }) => Promise<void>;
  onUpdateComment?: (activityId: string, content: string) => Promise<void>;
  currentUserId?: string | null;
  readOnly?: boolean;
  onImageUpload?: (file: File, sourceField: string) => Promise<string>;
}

export default function PortfolioActivity({
  entityType,
  entityId,
  activities,
  currentStatus,
  allowedTransitions,
  statusOptions,
  onAddComment,
  onUpdateComment,
  currentUserId,
  readOnly = false,
  onImageUpload,
}: PortfolioActivityProps) {
  const [activeTab, setActiveTab] = React.useState<ActivityTab>('comments');

  const handleTabChange = (_: React.MouseEvent<HTMLElement>, newTab: ActivityTab | null) => {
    if (newTab) {
      setActiveTab(newTab);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
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
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ minHeight: 200 }}>
        {activeTab === 'comments' && (
          <PortfolioComments
            entityType={entityType}
            entityId={entityId}
            activities={activities}
            currentStatus={currentStatus}
            allowedTransitions={allowedTransitions}
            statusOptions={statusOptions}
            onAddComment={onAddComment}
            onUpdateComment={onUpdateComment}
            currentUserId={currentUserId}
            readOnly={readOnly}
            onImageUpload={onImageUpload}
          />
        )}
        {activeTab === 'history' && (
          <PortfolioHistory
            entityType={entityType}
            activities={activities}
          />
        )}
      </Box>
    </Box>
  );
}
