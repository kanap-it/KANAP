import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class UpdatePlatformAiPlanLimitItemDto {
  @IsString()
  plan_name!: string;

  @IsInt()
  @Min(0)
  monthly_message_limit!: number;
}

export class UpdatePlatformAiPlanLimitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePlatformAiPlanLimitItemDto)
  items!: UpdatePlatformAiPlanLimitItemDto[];
}
