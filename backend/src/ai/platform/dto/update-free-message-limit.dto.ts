import { IsInt, Min } from 'class-validator';

export class UpdateFreeMessageLimitDto {
  @IsInt()
  @Min(0)
  monthly_message_limit!: number;
}
