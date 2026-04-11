import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_mapping_groups')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'mapping_set_id', 'order_index'])
export class InterfaceMappingGroup {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  mapping_set_id!: string;

  @Column('text')
  title!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('int', { default: 0 })
  order_index!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
