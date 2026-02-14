import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_owners')
@Index(['tenant_id', 'application_id', 'user_id', 'owner_type'], { unique: true })
export class ApplicationOwner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  owner_type!: 'business' | 'it';

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
