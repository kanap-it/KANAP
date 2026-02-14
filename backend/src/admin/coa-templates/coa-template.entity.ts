import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('coa_templates')
export class CoaTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('char', { length: 2, nullable: true })
  country_iso!: string | null;

  @Column('text')
  template_code!: string;

  @Column('text')
  template_name!: string;

  @Column('text')
  version!: string;

  @Column('boolean', { default: false })
  is_global!: boolean;

  @Column('boolean', { default: false })
  loaded_by_default!: boolean;

  @Column('text', { nullable: true })
  csv_payload!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
