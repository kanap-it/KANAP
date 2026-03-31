import { IsIn, IsInt, IsString, IsUrl, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdatePlatformAiConfigDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(['anthropic', 'openai', 'ollama', 'custom'])
  provider?: 'anthropic' | 'openai' | 'ollama' | 'custom';

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(100)
  model?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(4096)
  api_key?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ require_protocol: true, require_tld: false })
  endpoint_url?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  rate_limit_tenant_per_minute?: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  rate_limit_user_per_hour?: number;
}
