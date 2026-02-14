import { IsOptional, IsString } from 'class-validator';

export class FreezeTenantDto {
  @IsOptional()
  @IsString()
  reason?: string | null;
}

