import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BusinessProcess } from './business-process.entity';
import { BusinessProcessCategory } from './business-process-category.entity';

@Entity('business_process_category_links')
export class BusinessProcessCategoryLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid', { default: () => 'app_current_tenant()' })
  tenant_id!: string;

  @Column('uuid')
  process_id!: string;

  @ManyToOne(() => BusinessProcess)
  @JoinColumn({ name: 'process_id' })
  process?: BusinessProcess;

  @Column('uuid')
  category_id!: string;

  @ManyToOne(() => BusinessProcessCategory)
  @JoinColumn({ name: 'category_id' })
  category?: BusinessProcessCategory;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

