import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteTenantDto {
  @IsString()
  @IsNotEmpty()
  confirmSlug!: string;

  @IsOptional()
  @IsString()
  reason?: string | null;
}

