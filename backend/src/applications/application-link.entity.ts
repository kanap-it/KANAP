import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_links')
export class ApplicationLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

