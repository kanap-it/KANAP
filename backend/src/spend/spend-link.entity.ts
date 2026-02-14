import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spend_links')
export class SpendLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  spend_item_id!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

