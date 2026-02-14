export interface WorkspaceSettings {
  portfolio: {
    enabled: boolean;
    status_changes: boolean;
    team_additions: boolean;
    team_changes_as_lead: boolean;
    comments: boolean;
  };
  tasks: {
    enabled: boolean;
    as_assignee: boolean;
    as_requestor: boolean;
    as_viewer: boolean;
    status_changes: boolean;
    comments: boolean;
  };
  budget: {
    enabled: boolean;
    expiration_warnings: boolean;
    status_changes: boolean;
    comments: boolean;
  };
}

export interface NotificationPreferencesData {
  emails_enabled: boolean;
  workspace_settings: WorkspaceSettings;
  weekly_review_enabled: boolean;
  weekly_review_day: number;
  weekly_review_hour: number;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesData = {
  emails_enabled: false,
  workspace_settings: {
    portfolio: {
      enabled: false,
      status_changes: false,
      team_additions: false,
      team_changes_as_lead: false,
      comments: false,
    },
    tasks: {
      enabled: false,
      as_assignee: false,
      as_requestor: false,
      as_viewer: false,
      status_changes: false,
      comments: false,
    },
    budget: {
      enabled: false,
      expiration_warnings: false,
      status_changes: false,
      comments: false,
    },
  },
  weekly_review_enabled: false,
  weekly_review_day: 1, // Monday
  weekly_review_hour: 8,
  timezone: 'Europe/Paris',
};
