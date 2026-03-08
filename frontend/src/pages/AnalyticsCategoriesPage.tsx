import React, { useCallback, useMemo, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../components/ServerDataGrid';
import { Button } from '@mui/material';
import { STATUS_VALUES } from '../constants/status';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LinkCellRenderer } from '../components/grid/renderers';
import ForbiddenPage from './ForbiddenPage';

interface AnalyticsCategoryRow {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  disabled_at?: string | null;
  updated_at?: string;
}

export default function AnalyticsCategoriesPage() {
  const navigate = useNavigate();
  const { hasLevel } = useAuth();
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);

  if (!hasLevel('analytics', 'reader')) {
    return <ForbiddenPage />;
  }

  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'name:ASC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    return sp;
  }, []);

  const columns = useMemo<EnhancedColDef<AnalyticsCategoryRow>[]>(() => {
    const getAnalyticsHref = (row: AnalyticsCategoryRow) => {
      const sp = buildWorkspaceSearch();
      return `/master-data/analytics/${row.id}/overview?${sp.toString()}`;
    };

    return [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={getAnalyticsHref}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={getAnalyticsHref}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={getAnalyticsHref}
            onNavigate={(href) => navigate(href)}
          />
        ),
        filter: 'agSetColumnFilter',
        filterParams: { values: STATUS_VALUES, suppressMiniFilter: true },
      },
      {
        field: 'updated_at',
        headerName: 'Updated',
        width: 200,
        valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={getAnalyticsHref}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
    ];
  }, [buildWorkspaceSearch, navigate]);

  return (
    <>
      <PageHeader
        title="Analytics Dimensions"
        actions={hasLevel('analytics', 'member') ? [
          <Button key="new" variant="contained" onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/master-data/analytics/new/overview?${sp.toString()}`);
          }}>
            New Category
          </Button>,
        ] : []}
      />
      <ServerDataGrid<AnalyticsCategoryRow>
        endpoint="/analytics-categories"
        queryKey="analytics-categories"
        columns={columns}
        getRowId={(row) => row.id}
        enableSearch
        defaultSort={{ field: 'name', direction: 'ASC' }}
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
      />

    </>
  );
}
