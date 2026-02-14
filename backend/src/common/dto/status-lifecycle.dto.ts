import { IsEnum, IsISO8601, IsOptional } from 'class-validator';
import { StatusState } from '../status';

/**
 * Shared lifecycle fields for resources that can be enabled/disabled.
 */
export class StatusLifecycleDto {
  @IsOptional()
  @IsEnum(StatusState)
  status?: StatusState;

  @IsOptional()
  @IsISO8601()
  disabled_at?: string | null;
}
