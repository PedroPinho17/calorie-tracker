import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity.js';

/** Metas diárias: uma linha por utilizador. */
@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: Relation<User>;

  @Index({ unique: true })
  @Column({ type: 'uuid', nullable: true })
  userId!: string;

  @Column('int', { default: 2000 })
  kcal!: number;

  @Column('int', { default: 120 })
  protein!: number;

  @Column('int', { default: 220 })
  carbs!: number;

  @Column('int', { default: 65 })
  fat!: number;

  /** Meta diária de água, em ml. */
  @Column('int', { default: 2000 })
  waterMl!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}
