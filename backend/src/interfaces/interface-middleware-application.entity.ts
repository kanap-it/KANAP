import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_middleware_applications')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'interface_id', 'application_id'], { unique: true })
export class InterfaceMiddlewareApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  application_id!: string;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

