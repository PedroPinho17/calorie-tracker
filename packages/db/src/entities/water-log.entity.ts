import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { User } from './user.entity.js';

/** Um registo de água (ex.: um copo de 250 ml). O total do dia é a soma. */
@Entity('water_logs')
@Index(['userId', 'date'])
export class WaterLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: Relation<User>;

  @Column({ type: 'uuid', select: false })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column('int')
  ml!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
