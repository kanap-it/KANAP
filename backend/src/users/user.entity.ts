import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Role } from '../roles/role.entity';
import { Company } from '../companies/company.entity';
import { Department } from '../departments/department.entity';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenant_id!: string;

  @Column({ type: 'uuid', nullable: true })
  company_id!: string | null;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ type: 'uuid', nullable: true })
  department_id!: string | null;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'text', nullable: true })
  first_name!: string | null;

  @Column({ type: 'text', nullable: true })
  last_name!: string | null;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text', nullable: true })
  external_auth_provider!: string | null;

  @Column({ type: 'text', nullable: true })
  external_subject!: string | null;

  @Column({ type: 'text', nullable: true })
  job_title!: string | null;

  @Column({ type: 'text', nullable: true })
  business_phone!: string | null;

  @Column({ type: 'text', nullable: true })
  mobile_phone!: string | null;

  @Column({ type: 'text', nullable: true })
  password_hash!: string | null;

  @Column({ type: 'uuid' })
  role_id!: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  // Multi-role support: all roles assigned to this user
  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles?: UserRole[];

  @Column({ type: 'boolean', default: false })
  mfa_enabled!: boolean;

  @Column({ type: 'text', nullable: true })
  mfa_secret!: string | null;

  @Column({ type: 'text', default: 'enabled' })
  status!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
