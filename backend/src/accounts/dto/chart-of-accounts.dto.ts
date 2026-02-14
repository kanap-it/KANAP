import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class ChartOfAccountsUpsertDto {
  @IsOptional()
  @IsString()
  code?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country_iso?: string | null;

  @IsOptional()
  @IsIn(['GLOBAL', 'COUNTRY'])
  scope?: 'GLOBAL' | 'COUNTRY' | null;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean | null;
}
