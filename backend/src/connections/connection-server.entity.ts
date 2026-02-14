import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('connection_servers')
@Index(['tenant_id', 'connection_id', 'asset_id'], { unique: true })
export class ConnectionServer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  connection_id!: string;

  @Column('uuid')
  asset_id!: string;
}
