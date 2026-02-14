import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column({ type: 'text' })
  role_name!: string;

  @Column({ type: 'text', nullable: true })
  role_description!: string | null;

  @Column({ type: 'boolean', default: false })
  is_system!: boolean;

  @Column({ type: 'boolean', default: false })
  is_built_in!: boolean;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
