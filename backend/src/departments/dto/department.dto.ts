import { IsOptional, IsString, IsUUID } from 'class-validator';
import { StatusLifecycleDto } from '../../common/dto/status-lifecycle.dto';

export class DepartmentUpsertDto extends StatusLifecycleDto {
  @IsOptional()
  @IsUUID()
  company_id?: string | null;

  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
