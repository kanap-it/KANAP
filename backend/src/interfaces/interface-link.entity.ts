import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_links')
@Index(['tenant_id', 'interface_id'])
export class InterfaceLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('text')
  kind!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

