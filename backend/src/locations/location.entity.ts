import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('locations')
@Index(['tenant_id', 'hosting_type'])
@Index(['tenant_id', 'provider'])
@Index(['tenant_id', 'country_iso', 'city'])
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('text')
  code!: string;

  @Column('text')
  name!: string;

  @Column('text')
  hosting_type!: string;

  @Column('uuid', { nullable: true })
  operating_company_id!: string | null;

  @Column('char', { length: 2, nullable: true })
  country_iso!: string | null;

  @Column('text', { nullable: true })
  city!: string | null;

  @Column('text', { nullable: true })
  datacenter!: string | null;

  @Column('text', { nullable: true })
  provider!: string | null;

  @Column('text', { nullable: true })
  region!: string | null;

  @Column('text', { nullable: true })
  additional_info!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}

