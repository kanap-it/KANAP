import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_spend_items')
@Index(['application_id', 'spend_item_id'], { unique: true })
export class ApplicationSpendItemLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  spend_item_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

