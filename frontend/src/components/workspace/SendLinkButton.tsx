import React from 'react';
import { Button } from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import { useTranslation } from 'react-i18next';
import ShareDialog, { type ShareItemType } from '../ShareDialog';

type SendLinkButtonProps = {
  itemType: ShareItemType;
  itemId: string;
  itemName: string;
  itemNumber?: number | null;
  itemRef?: string | null;
  disabled?: boolean;
};

export default function SendLinkButton({
  itemType,
  itemId,
  itemName,
  itemNumber,
  itemRef,
  disabled = false,
}: SendLinkButtonProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        variant="action"
        onClick={() => setOpen(true)}
        disabled={disabled}
        startIcon={<ShareIcon sx={{ fontSize: '14px !important' }} />}
      >
        {t('share.sendLink')}
      </Button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        itemType={itemType}
        itemId={itemId}
        itemName={itemName}
        itemNumber={itemNumber}
        itemRef={itemRef}
      />
    </>
  );
}
