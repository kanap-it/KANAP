import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_owners')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'interface_id', 'user_id', 'owner_type'], { unique: true })
export class InterfaceOwner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  owner_type!: 'business' | 'it';

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

