import { IsIn, IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

export class TestPlatformAiConfigDto {
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
}
