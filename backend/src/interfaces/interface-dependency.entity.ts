import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_dependencies')
@Index(['tenant_id', 'interface_id', 'direction'])
export class InterfaceDependency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  related_interface_id!: string;

  @Column('text')
  direction!: 'upstream' | 'downstream';

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

