import React from 'react';
import { Avatar, Box, Stack, Tooltip, Typography } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';

/**
 * User data structure
 */
export interface UserData {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
}

/**
 * Props for the UserCellRenderer component
 */
export interface UserCellRendererProps<T = unknown> extends ICellRendererParams<T> {
  /** Show avatar */
  showAvatar?: boolean;
  /** Show email in addition to name */
  showEmail?: boolean;
  /** Size of the avatar */
  avatarSize?: number;
  /** Field path to get user data (if value is not the user object) */
  userField?: string;
  /** Fields to extract name from (in order of priority) */
  nameFields?: string[];
  /** Field to extract email from */
  emailField?: string;
  /** Callback when user cell is clicked */
  onClick?: (data: T, user: UserData | null) => void;
  /** Text to show when user is null/undefined */
  emptyText?: string;
}

/**
 * Get initials from a name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get display name from user data
 */
function getDisplayName(
  user: UserData | null | undefined,
  nameFields: string[]
): string {
  if (!user) return '';

  // Try to use the explicit name field first
  if (user.name) return user.name;

  // Try first_name + last_name
  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  // Try custom fields
  for (const field of nameFields) {
    const value = (user as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  // Fall back to email
  return user.email ?? '';
}

/**
 * Extract user data from cell value or row data
 */
function extractUserData(
  value: unknown,
  data: unknown,
  userField?: string
): UserData | null {
  // If userField is specified, get from data
  if (userField && data) {
    const fieldParts = userField.split('.');
    let result: unknown = data;
    for (const part of fieldParts) {
      if (result && typeof result === 'object') {
        result = (result as Record<string, unknown>)[part];
      } else {
        result = undefined;
        break;
      }
    }
    if (result && typeof result === 'object') {
      return result as UserData;
    }
    // If result is a string, treat it as a name
    if (typeof result === 'string') {
      return { name: result };
    }
    return null;
  }

  // Value is already a user object
  if (value && typeof value === 'object') {
    return value as UserData;
  }

  // Value is a string (name or email)
  if (typeof value === 'string') {
    const isEmail = value.includes('@');
    return isEmail ? { email: value } : { name: value };
  }

  return null;
}

/**
 * UserCellRenderer - Renders user information with optional avatar
 *
 * Usage in column definition:
 * ```tsx
 * {
 *   field: 'owner',
 *   headerName: 'Owner',
 *   cellRenderer: UserCellRenderer,
 *   cellRendererParams: {
 *     showAvatar: true,
 *     showEmail: false,
 *     avatarSize: 28,
 *   },
 * }
 * ```
 */
export function UserCellRenderer<T = unknown>(
  props: UserCellRendererProps<T>
): React.ReactElement | null {
  const {
    value,
    data,
    showAvatar = false,
    showEmail = false,
    avatarSize = 24,
    userField,
    nameFields = ['display_name', 'full_name', 'username'],
    emailField = 'email',
    onClick,
    emptyText = '',
  } = props;

  const user = extractUserData(value, data, userField);
  const displayName = getDisplayName(user, nameFields);
  const email = user?.[emailField as keyof UserData] as string | undefined ?? user?.email;

  if (!displayName && !email) {
    return emptyText ? (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    ) : null;
  }

  const initials = getInitials(displayName || email);
  const avatarUrl = user?.avatar_url;
  const tooltipContent = showEmail && email && email !== displayName
    ? `${displayName}\n${email}`
    : displayName || email;

  const handleClick = onClick && data
    ? () => onClick(data, user)
    : undefined;

  const content = (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{
        cursor: handleClick ? 'pointer' : 'default',
        '&:hover': handleClick ? { color: 'text.primary' } : undefined,
      }}
      onClick={handleClick}
    >
      {showAvatar && (
        <Avatar
          src={avatarUrl}
          sx={{
            width: avatarSize,
            height: avatarSize,
            fontSize: avatarSize * 0.4,
            bgcolor: 'grey.500',
          }}
        >
          {initials}
        </Avatar>
      )}
      <Box>
        <Typography
          variant="body2"
          component="span"
          sx={{ display: 'block', lineHeight: 1.3 }}
        >
          {displayName || email}
        </Typography>
        {showEmail && email && email !== displayName && (
          <Typography
            variant="caption"
            color="text.secondary"
            component="span"
            sx={{ display: 'block', lineHeight: 1.2 }}
          >
            {email}
          </Typography>
        )}
      </Box>
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent || ''} placement="top">
      {content}
    </Tooltip>
  );
}

/**
 * Factory function to create a UserCellRenderer with preset configurations
 */
export function createUserCellRenderer<T = unknown>(
  config: Omit<UserCellRendererProps<T>, keyof ICellRendererParams<T>>
): React.FC<ICellRendererParams<T>> {
  return function ConfiguredUserCellRenderer(params: ICellRendererParams<T>) {
    return <UserCellRenderer {...params} {...config} />;
  };
}

/**
 * Pre-configured renderer with avatar
 */
export const UserWithAvatarRenderer = createUserCellRenderer({
  showAvatar: true,
  avatarSize: 28,
});

/**
 * Pre-configured renderer with avatar and email
 */
export const UserFullRenderer = createUserCellRenderer({
  showAvatar: true,
  showEmail: true,
  avatarSize: 32,
});

/**
 * Pre-configured renderer for simple name display
 */
export const UserNameRenderer = createUserCellRenderer({
  showAvatar: false,
  showEmail: false,
});

export default UserCellRenderer;
