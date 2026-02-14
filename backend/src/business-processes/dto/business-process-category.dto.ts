import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BusinessProcessCategoryUpsertDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}

