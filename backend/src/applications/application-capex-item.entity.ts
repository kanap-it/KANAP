import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_capex_items')
@Index(['application_id', 'capex_item_id'], { unique: true })
export class ApplicationCapexItemLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  capex_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

