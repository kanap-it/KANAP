import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('interface_mapping_rules')
@Index(['tenant_id', 'interface_id'])
@Index(['tenant_id', 'mapping_set_id', 'order_index'])
@Index(['tenant_id', 'group_id', 'order_index'])
@Index(['tenant_id', 'mapping_set_id', 'rule_key'], { unique: true, where: '"rule_key" IS NOT NULL' })
export class InterfaceMappingRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  interface_id!: string;

  @Column('uuid')
  mapping_set_id!: string;

  @Column('uuid', { nullable: true })
  group_id!: string | null;

  @Column('text', { nullable: true })
  rule_key!: string | null;

  @Column('text')
  title!: string;

  @Column('int', { default: 0 })
  order_index!: number;

  @Column('uuid', { nullable: true })
  applies_to_leg_id!: string | null;

  @Column('text', { default: 'direct' })
  operation_kind!: string;

  @Column('jsonb', { default: '[]' })
  source_bindings!: Array<Record<string, unknown>>;

  @Column('jsonb', { default: '[]' })
  target_bindings!: Array<Record<string, unknown>>;

  @Column('text', { nullable: true })
  condition_text!: string | null;

  @Column('text', { nullable: true })
  business_rule_text!: string | null;

  @Column('text', { nullable: true })
  middleware_rule_text!: string | null;

  @Column('text', { nullable: true })
  remarks!: string | null;

  @Column('text', { nullable: true })
  example_input!: string | null;

  @Column('text', { nullable: true })
  example_output!: string | null;

  @Column('text', { nullable: true })
  implementation_status!: string | null;

  @Column('text', { nullable: true })
  test_status!: string | null;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;

  @Column('timestamptz', { default: () => 'now()' })
  updated_at!: Date;
}
