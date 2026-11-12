import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity.js';

/** Peso de um dia: um registo por utilizador e dia (registar outra vez substitui). */
@Entity('weight_logs')
@Index(['userId', 'date'], { unique: true })
export class WeightLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: Relation<User>;

  @Column({ type: 'uuid', select: false })
  userId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column('float')
  kg!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
