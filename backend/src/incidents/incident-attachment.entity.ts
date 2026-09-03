import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('incident_attachments')
export class IncidentAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  incident_id!: string;

  @Column('text')
  original_filename!: string;

  @Column('text')
  stored_filename!: string;

  @Column('text', { nullable: true })
  mime_type!: string | null;

  @Column('int', { default: 0 })
  size!: number;

  @Column('text')
  storage_path!: string;

  @Column('uuid', { nullable: true })
  uploaded_by!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  uploaded_at!: Date;

  // Soft delete: the register keeps the file, the list hides it.
  @Column('timestamptz', { nullable: true })
  deleted_at!: Date | null;
}
