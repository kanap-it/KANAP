import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('location_links')
@Index(['tenant_id', 'location_id'])
export class LocationLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  location_id!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text')
  url!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

