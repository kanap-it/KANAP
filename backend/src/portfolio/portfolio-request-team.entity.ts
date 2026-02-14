import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TeamRole = 'business_team' | 'it_team';

@Entity('portfolio_request_team')
@Index(['request_id', 'user_id', 'role'], { unique: true })
export class PortfolioRequestTeam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  request_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  role!: TeamRole;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
