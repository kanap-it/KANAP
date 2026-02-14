import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('account_classifications')
export class AccountClassification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('text', { unique: true })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;
}

