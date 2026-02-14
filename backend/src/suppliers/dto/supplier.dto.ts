import { IsOptional, IsString } from 'class-validator';
import { StatusLifecycleDto } from '../../common/dto/status-lifecycle.dto';

export class SupplierUpsertDto extends StatusLifecycleDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  erp_supplier_id?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
