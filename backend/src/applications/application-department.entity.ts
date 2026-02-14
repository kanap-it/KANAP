import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('application_departments')
@Index(['application_id', 'department_id'], { unique: true })
export class ApplicationDepartment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('uuid')
  department_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

