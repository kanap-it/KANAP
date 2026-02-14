import { IsOptional, IsString, Length } from 'class-validator';
import { StatusLifecycleDto } from '../../common/dto/status-lifecycle.dto';

export class CompanyUpsertDto extends StatusLifecycleDto {
  @IsOptional()
  @IsString()
  coa_id?: string | null;
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country_iso?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  postal_code?: string | null;

  @IsOptional()
  @IsString()
  address1?: string | null;

  @IsOptional()
  @IsString()
  address2?: string | null;

  @IsOptional()
  @IsString()
  reg_number?: string | null;

  @IsOptional()
  @IsString()
  vat_number?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  base_currency?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
