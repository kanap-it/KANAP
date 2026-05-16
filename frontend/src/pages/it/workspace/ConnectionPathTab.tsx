import React from 'react';
import { Box } from '@mui/material';
import ConnectionPathSection, { ConnectionPathHop } from './ConnectionPathSection';

type Props = {
  connectionId: string;
  hops: ConnectionPathHop[];
  canManage: boolean;
  defaultProtocolCodes: string[];
  assetMap: Record<string, { name: string; reference?: string | null }>;
  sourceLabel: string;
  destinationLabel: string;
  onChange: (next: ConnectionPathHop[]) => void;
};

export default function ConnectionPathTab(props: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ConnectionPathSection {...props} />
    </Box>
  );
}
