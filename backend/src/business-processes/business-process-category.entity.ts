import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('business_process_categories')
export class BusinessProcessCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('text')
  name!: string;

  @Column('boolean', { default: false })
  is_default!: boolean;

  @Column('boolean', { default: true })
  is_active!: boolean;

  @Column('integer', { default: 100 })
  sort_order!: number;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

