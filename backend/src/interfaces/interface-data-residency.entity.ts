import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_data_residency')
@Index(['interface_id', 'country_iso'], { unique: true })
export class InterfaceDataResidency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('char', { length: 2 })
  country_iso!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

