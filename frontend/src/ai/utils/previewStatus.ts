import { AiMutationPreview } from '../aiTypes';

export type PreviewStatusDisplay =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'expired'
  | 'failed';

export function getPreviewStatusDisplay(preview: AiMutationPreview): PreviewStatusDisplay {
  if (preview.status === 'executed') {
    return 'applied';
  }
  if (preview.status === 'approved') {
    return 'approved';
  }
  if (preview.status === 'pending' && preview.approved_at && !preview.executed_at) {
    return 'approved';
  }
  if (preview.status === 'expired') {
    return 'expired';
  }
  if (preview.status === 'failed') {
    return 'failed';
  }
  if (preview.status === 'rejected') {
    return 'rejected';
  }
  return 'pending';
}

export function getPreviewStatusColorKey(status: PreviewStatusDisplay): string {
  switch (status) {
    case 'applied':
      return 'success';
    case 'approved':
      return 'info';
    case 'failed':
      return 'error';
    case 'expired':
      return 'warning';
    default:
      return 'default';
  }
}
