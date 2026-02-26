import React from 'react';
import { useThemeMode } from '../config/ThemeContext';

type AgGridBoxProps = React.HTMLAttributes<HTMLDivElement>;

const AgGridBox = React.forwardRef<HTMLDivElement, AgGridBoxProps>(function AgGridBox({ className, ...props }, ref) {
  const { resolvedMode } = useThemeMode();
  const themeClass = resolvedMode === 'dark' ? 'ag-theme-quartz-dark' : 'ag-theme-quartz';
  const mergedClassName = className ? `${themeClass} ${className}` : themeClass;

  return <div ref={ref} className={mergedClassName} {...props} />;
});

export default AgGridBox;
