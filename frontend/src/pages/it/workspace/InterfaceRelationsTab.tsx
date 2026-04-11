import React from 'react';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import InterfaceRelationsEditor from './InterfaceRelationsEditor';
import type { InterfaceTabProps } from '../components/interface-workspace/types';

type InterfaceRelationsTabProps = InterfaceTabProps & {
  canManage: boolean;
};

export default function InterfaceRelationsTab({
  canManage,
  data,
  update,
  markDirty,
}: InterfaceRelationsTabProps) {
  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">Knowledge</Typography>
        <Alert severity="info">
          Interface knowledge links are not supported by the current knowledge relation backend yet. This tab keeps the intended structure for Phase 1, while dependencies, external URLs, and attachments remain fully editable below.
        </Alert>
      </Stack>

      <Divider />

      <InterfaceRelationsEditor
        canManage={canManage}
        data={data}
        isCreate={false}
        markDirty={markDirty}
        update={update}
      />
    </Stack>
  );
}
