import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const EXPORT_FORMATS = ['pdf', 'docx', 'odt'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ExportDto {
  @IsString()
  @MaxLength(1_000_000)
  content!: string;

  @IsString()
  @IsIn(EXPORT_FORMATS)
  format!: ExportFormat;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
