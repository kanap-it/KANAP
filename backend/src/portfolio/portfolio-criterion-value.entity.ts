import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('portfolio_criterion_values')
@Index(['criterion_id', 'position'])
export class PortfolioCriterionValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  criterion_id!: string;

  @Column('text')
  label!: string;

  @Column('int')
  position!: number;

  @Column('boolean', { default: false })
  triggers_mandatory_bypass!: boolean;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
