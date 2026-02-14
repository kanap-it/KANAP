import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { StatusLifecycleDto } from '../../common/dto/status-lifecycle.dto';

const PPE_TYPES = ['hardware', 'software'] as const;
const INVESTMENT_TYPES = ['replacement', 'capacity', 'productivity', 'security', 'conformity', 'business_growth', 'other'] as const;
const PRIORITY_LEVELS = ['mandatory', 'high', 'medium', 'low'] as const;

export class CapexItemUpsertDto extends StatusLifecycleDto {
  // Temporary: accept legacy company_id but prefer paying_company_id
  @IsOptional()
  @IsUUID()
  paying_company_id?: string | null;

  @IsOptional()
  @IsUUID()
  company_id?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsIn(PPE_TYPES)
  ppe_type?: (typeof PPE_TYPES)[number] | null;

  @IsOptional()
  @IsIn(INVESTMENT_TYPES)
  investment_type?: (typeof INVESTMENT_TYPES)[number] | null;

  @IsOptional()
  @IsIn(PRIORITY_LEVELS)
  priority?: (typeof PRIORITY_LEVELS)[number] | null;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | null;

  @IsOptional()
  @IsISO8601()
  effective_start?: string | null;

  @IsOptional()
  @IsISO8601()
  effective_end?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsUUID()
  account_id?: string | null;

  @IsOptional()
  @IsUUID()
  supplier_id?: string | null;

  @IsOptional()
  @IsUUID()
  project_id?: string | null;
}
