import React from 'react';
import { Box, Link, Tooltip, Typography } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

/**
 * Link type for routing
 */
export type LinkType = 'internal' | 'external' | 'auto';

/**
 * Props for the LinkCellRenderer component
 */
export interface LinkCellRendererProps<T = unknown> extends ICellRendererParams<T> {
  /** Type of link (internal uses react-router, external opens in new tab) */
  linkType?: LinkType;
  /** Function to generate href from row data */
  getHref?: (data: T) => string | null;
  /** Static href prefix (combined with value) */
  hrefPrefix?: string;
  /** Static href suffix (combined with value) */
  hrefSuffix?: string;
  /** Field to use for the link URL (if different from value) */
  hrefField?: string;
  /** Field to use for the display text (if different from value) */
  labelField?: string;
  /** Show external link icon for external links */
  showExternalIcon?: boolean;
  /** Text to show when value is empty */
  emptyText?: string;
  /** Tooltip content (or function to generate it) */
  tooltip?: string | ((data: T, value: unknown) => string);
  /** Callback for internal navigation (use with react-router) */
  onNavigate?: (href: string, data: T) => void;
  /** Max width for text truncation */
  maxWidth?: number | string;
}

/**
 * Detect if a URL is external
 */
function isExternalUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Get value from a nested field path
 */
function getFieldValue(data: unknown, fieldPath: string): unknown {
  if (!data || typeof data !== 'object') return undefined;
  const parts = fieldPath.split('.');
  let result: unknown = data;
  for (const part of parts) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return result;
}

/**
 * LinkCellRenderer - Renders clickable links with navigation support
 *
 * Usage in column definition:
 * ```tsx
 * // Internal link
 * {
 *   field: 'name',
 *   headerName: 'Name',
 *   cellRenderer: LinkCellRenderer,
 *   cellRendererParams: {
 *     linkType: 'internal',
 *     getHref: (data) => `/items/${data.id}`,
 *     onNavigate: (href) => navigate(href),
 *   },
 * }
 *
 * // External link
 * {
 *   field: 'website',
 *   headerName: 'Website',
 *   cellRenderer: LinkCellRenderer,
 *   cellRendererParams: {
 *     linkType: 'external',
 *     showExternalIcon: true,
 *   },
 * }
 * ```
 */
export function LinkCellRenderer<T = unknown>(
  props: LinkCellRendererProps<T>
): React.ReactElement | null {
  const {
    value,
    data,
    linkType = 'auto',
    getHref,
    hrefPrefix = '',
    hrefSuffix = '',
    hrefField,
    labelField,
    showExternalIcon = true,
    emptyText = '',
    tooltip,
    onNavigate,
    maxWidth,
  } = props;

  // Get display text
  const displayText = labelField && data
    ? String(getFieldValue(data, labelField) ?? '')
    : String(value ?? '');

  if (!displayText && !emptyText) {
    return null;
  }

  if (!displayText) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    );
  }

  // Get href
  let href: string | null = null;
  if (getHref && data) {
    href = getHref(data);
  } else if (hrefField && data) {
    const hrefValue = getFieldValue(data, hrefField);
    href = hrefValue ? String(hrefValue) : null;
  } else if (value) {
    href = `${hrefPrefix}${String(value)}${hrefSuffix}`;
  }

  // If no href, render as plain text
  if (!href) {
    return (
      <Typography variant="body2">
        {displayText}
      </Typography>
    );
  }

  // Determine link type
  const isExternal = linkType === 'external' || (linkType === 'auto' && isExternalUrl(href));

  // Get tooltip content
  const tooltipContent = typeof tooltip === 'function' && data
    ? tooltip(data, value)
    : tooltip ?? (isExternal ? href : displayText);

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (!isExternal && onNavigate && data) {
      e.preventDefault();
      onNavigate(href!, data);
    }
  };

  const content = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        maxWidth: maxWidth,
      }}
    >
      <Link
        href={href}
        onClick={handleClick}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        underline="hover"
        sx={{
          display: 'block',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayText}
      </Link>
      {isExternal && showExternalIcon && (
        <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
      )}
    </Box>
  );

  if (typeof tooltipContent === 'string' && tooltipContent) {
    return (
      <Tooltip title={tooltipContent} placement="top">
        {content}
      </Tooltip>
    );
  }

  return content;
}

/**
 * Factory function to create a LinkCellRenderer with preset configurations
 */
export function createLinkCellRenderer<T = unknown>(
  config: Omit<LinkCellRendererProps<T>, keyof ICellRendererParams<T>>
): React.FC<ICellRendererParams<T>> {
  return function ConfiguredLinkCellRenderer(params: ICellRendererParams<T>) {
    return <LinkCellRenderer {...params} {...config} />;
  };
}

/**
 * Pre-configured renderer for external URLs
 */
export const ExternalLinkRenderer = createLinkCellRenderer({
  linkType: 'external',
  showExternalIcon: true,
});

/**
 * Pre-configured renderer for email links
 */
export const EmailLinkRenderer = createLinkCellRenderer({
  linkType: 'external',
  hrefPrefix: 'mailto:',
  showExternalIcon: false,
});

/**
 * Pre-configured renderer for phone links
 */
export const PhoneLinkRenderer = createLinkCellRenderer({
  linkType: 'external',
  hrefPrefix: 'tel:',
  showExternalIcon: false,
});

export default LinkCellRenderer;
