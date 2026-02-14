import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_key_identifiers')
@Index(['tenant_id', 'interface_id'])
export class InterfaceKeyIdentifier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('text')
  source_identifier!: string;

  @Column('text')
  destination_identifier!: string;

  @Column('text', { nullable: true })
  identifier_notes!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}

