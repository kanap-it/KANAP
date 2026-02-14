import React from 'react';

export interface VirtualRowsConfig<T> {
  items: T[];
  rowHeight: number;
  overscan?: number;
  threshold?: number;
  maxVisibleRows?: number;
}

export interface VirtualRowsResult<T> {
  containerRef: React.RefObject<HTMLDivElement>;
  virtualItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  visibleItems: T[];
  totalHeight: number;
  maxHeight: number;
  paddingTop: number;
  paddingBottom: number;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  useVirtual: boolean;
  startIndex: number;
  endIndex: number;
}

/**
 * A hook for virtual scrolling of large lists in table-like layouts.
 * Only renders items that are visible in the viewport plus an overscan buffer.
 *
 * @param config Configuration object
 * @param config.items The full array of items to virtualize
 * @param config.rowHeight The height of each row in pixels
 * @param config.overscan Number of items to render above/below the visible area (default: 4)
 * @param config.threshold Minimum number of items before virtualization kicks in (default: 25)
 * @param config.maxVisibleRows Maximum rows shown in viewport before scrolling (default: 20)
 */
export function useVirtualRows<T>(config: VirtualRowsConfig<T>): VirtualRowsResult<T> {
  const {
    items,
    rowHeight,
    overscan = 4,
    threshold = 25,
    maxVisibleRows = 20,
  } = config;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(rowHeight * maxVisibleRows);

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    setViewportHeight(containerRef.current.clientHeight || rowHeight * maxVisibleRows);
  }, [items.length, rowHeight, maxVisibleRows]);

  const useVirtual = items.length > threshold;

  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (useVirtual) {
        setScrollTop(e.currentTarget.scrollTop);
      }
    },
    [useVirtual]
  );

  const startIndex = useVirtual
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    : 0;

  const endIndex = useVirtual
    ? Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan)
    : items.length;

  const paddingTop = useVirtual ? startIndex * rowHeight : 0;
  const paddingBottom = useVirtual ? Math.max(0, (items.length - endIndex) * rowHeight) : 0;
  const visibleItems = useVirtual ? items.slice(startIndex, endIndex) : items;

  const totalHeight = items.length * rowHeight;
  const maxHeight = rowHeight * maxVisibleRows + 64; // extra room for header

  // Build virtualItems array with style information
  const virtualItems = React.useMemo(() => {
    return visibleItems.map((item, localIndex) => {
      const actualIndex = startIndex + localIndex;
      return {
        item,
        index: actualIndex,
        style: {
          position: 'absolute' as const,
          top: actualIndex * rowHeight,
          left: 0,
          right: 0,
          height: rowHeight,
        },
      };
    });
  }, [visibleItems, startIndex, rowHeight]);

  return {
    containerRef,
    virtualItems,
    visibleItems,
    totalHeight,
    maxHeight,
    paddingTop,
    paddingBottom,
    onScroll,
    useVirtual,
    startIndex,
    endIndex,
  };
}

export default useVirtualRows;
