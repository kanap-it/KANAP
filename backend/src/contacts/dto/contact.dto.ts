import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { SupplierContactRole } from '../supplier-contact.entity';

export class ContactUpsertDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  first_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  last_name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  job_title?: string | null;

  @IsString()
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsUUID()
  supplier_id?: string | null;

  @IsOptional()
  @IsIn(Object.values(SupplierContactRole))
  supplier_role?: SupplierContactRole | null;
}

export class SupplierContactAttachDto {
  @IsString()
  contactId!: string;

  @IsString()
  @IsIn(['commercial','technical','support','other'])
  role!: 'commercial'|'technical'|'support'|'other';

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
