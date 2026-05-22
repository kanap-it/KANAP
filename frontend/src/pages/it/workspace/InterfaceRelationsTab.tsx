import React from 'react';
import { Divider, Stack } from '@mui/material';
import EntityKnowledgePanel from '../../../components/EntityKnowledgePanel';
import InterfaceRelationsEditor from './InterfaceRelationsEditor';
import type { InterfaceDependency, InterfaceLink, InterfaceTabProps } from '../components/interface-workspace/types';

type InterfaceRelationsTabProps = InterfaceTabProps & {
  canManage: boolean;
  onReplaceDependencies?: (rows: InterfaceDependency[]) => Promise<void>;
  onReplaceLinks?: (rows: InterfaceLink[]) => Promise<void>;
};

export default function InterfaceRelationsTab({
  canManage,
  data,
  onReplaceDependencies,
  onReplaceLinks,
  update,
  markDirty,
}: InterfaceRelationsTabProps) {
  return (
    <Stack spacing={3}>
      {data?.id ? (
        <EntityKnowledgePanel
          entityType="interfaces"
          entityId={data.id}
          canCreate={canManage}
        />
      ) : null}

      <Divider />

      <InterfaceRelationsEditor
        canManage={canManage}
        data={data}
        isCreate={false}
        markDirty={markDirty}
        onReplaceDependencies={onReplaceDependencies}
        onReplaceLinks={onReplaceLinks}
        update={update}
      />
    </Stack>
  );
}
