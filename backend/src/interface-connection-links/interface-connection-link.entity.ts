import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_connection_links')
@Index(['tenant_id', 'interface_binding_id'])
@Index(['tenant_id', 'connection_id'])
@Index(['tenant_id', 'interface_binding_id', 'connection_id'], { unique: true })
export class InterfaceConnectionLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_binding_id!: string;

  @Column('uuid')
  connection_id!: string;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
