import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { TeamRole } from './portfolio-request-team.entity';

@Entity('portfolio_project_team')
@Index(['project_id', 'user_id', 'role'], { unique: true })
export class PortfolioProjectTeam {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column('uuid')
  project_id!: string;

  @Column('uuid')
  user_id!: string;

  @Column('text')
  role!: TeamRole;

  @Column('timestamptz', { default: () => 'now()' })
  created_at!: Date;
}
