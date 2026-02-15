import {
  CanActivate,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Features } from '../config/features';

export class FeatureDisabledError extends Error {
  readonly code = 'FEATURE_DISABLED';
  constructor(
    public readonly feature: string,
    message?: string,
  ) {
    super(message || `${feature} is not available in this deployment.`);
  }
}

export function throwNotAvailableInMode(): never {
  throw new NotFoundException();
}

export function throwFeatureDisabled(feature: string): never {
  throw new ForbiddenException({
    code: 'FEATURE_DISABLED',
    feature,
    message: `${feature} is not available in this deployment.`,
  });
}

@Injectable()
export class MultiTenantOnlyGuard implements CanActivate {
  canActivate(): boolean {
    if (Features.SINGLE_TENANT) throw new NotFoundException();
    return true;
  }
}
