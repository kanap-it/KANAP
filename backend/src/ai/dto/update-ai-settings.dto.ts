import { IsBoolean, IsIn, IsInt, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

export class UpdateAiSettingsDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  chat_enabled?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  mcp_enabled?: boolean;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(['anthropic', 'openai', 'ollama', 'custom'])
  llm_provider?: 'anthropic' | 'openai' | 'ollama' | 'custom' | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  llm_api_key?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  llm_endpoint_url?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(100)
  llm_model?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  mcp_key_max_lifetime_days?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  conversation_retention_days?: number | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  web_enrichment_enabled?: boolean;
}
