import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_mapping_sets')
@Index(['tenant_id', 'interface_id', 'name'], { unique: true })
@Index(['tenant_id', 'interface_id'], { unique: true, where: '"is_default" = true' })
export class InterfaceMappingSet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: false })
  is_default!: boolean;

  @Column('int', { default: 1 })
  revision_number!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
