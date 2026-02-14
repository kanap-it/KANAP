import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('connection_legs')
@Index(['tenant_id', 'connection_id'])
@Index(['tenant_id', 'connection_id', 'order_index'], { unique: true })
export class ConnectionLeg {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  connection_id!: string;

  @Column('integer')
  order_index!: number;

  @Column('text')
  layer_type!: string;

  @Column('uuid', { nullable: true })
  source_asset_id!: string | null;

  @Column('text', { nullable: true })
  source_entity_code!: string | null;

  @Column('uuid', { nullable: true })
  destination_asset_id!: string | null;

  @Column('text', { nullable: true })
  destination_entity_code!: string | null;

  @Column('text', { array: true })
  protocol_codes!: string[];

  @Column('text', { nullable: true })
  port_override!: string | null;

  @Column('text', { nullable: true })
  notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
