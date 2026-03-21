import { SetMetadata } from '@nestjs/common';

export const SKIP_TENANT_TRANSACTION_KEY = 'skipTenantTransaction';

export const SkipTenantTransaction = () => SetMetadata(SKIP_TENANT_TRANSACTION_KEY, true);
