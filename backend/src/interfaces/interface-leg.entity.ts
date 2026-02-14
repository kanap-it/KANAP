import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_legs')
@Index(['tenant_id', 'interface_id'])
export class InterfaceLeg {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('text')
  leg_type!: 'extract' | 'transform' | 'load' | 'direct';

  @Column('text')
  from_role!: string;

  @Column('text')
  to_role!: string;

  @Column('text')
  trigger_type!: string;

  @Column('text')
  integration_pattern!: string;

  @Column('text')
  data_format!: string;

  @Column('text', { nullable: true })
  job_name!: string | null;

  @Column('int')
  order_index!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

