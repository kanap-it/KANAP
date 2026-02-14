import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { StatusLifecycleDto } from '../../common/dto/status-lifecycle.dto';

export class BusinessProcessUpsertDto extends StatusLifecycleDto {
  @IsOptional()
  @IsString()
  name?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  owner_user_id?: string | null;

  @IsOptional()
  @IsString()
  it_owner_user_id?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  category_ids?: string[] | null;
}
