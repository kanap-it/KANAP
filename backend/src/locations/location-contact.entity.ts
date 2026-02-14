import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('location_contacts')
@Index(['tenant_id', 'location_id', 'contact_id'], { unique: true })
@Index(['tenant_id', 'location_id'])
export class LocationContactLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  location_id!: string;

  @Column('uuid')
  contact_id!: string;

  @Column('text', { nullable: true })
  role!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
