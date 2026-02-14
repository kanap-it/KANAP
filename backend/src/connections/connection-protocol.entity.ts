import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('connection_protocols')
@Index(['tenant_id', 'connection_id', 'connection_type_code'], { unique: true })
export class ConnectionProtocol {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  connection_id!: string;

  @Column('text')
  connection_type_code!: string;
}
