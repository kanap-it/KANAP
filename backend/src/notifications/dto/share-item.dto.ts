import { IsArray, IsString, IsOptional, IsEmail } from 'class-validator';

export class ShareItemDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipient_user_ids?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  recipient_emails?: string[];

  @IsOptional()
  @IsString()
  message?: string;
}
