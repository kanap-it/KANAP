import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_support_contacts')
@Index(['application_id'])
export class ApplicationSupportContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  contact_id!: string;

  @Column('text', { nullable: true })
  role!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
