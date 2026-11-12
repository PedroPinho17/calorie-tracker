import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { MealItem } from './meal-item.entity.js';
import { User } from './user.entity.js';

@Entity('meals')
// As consultas são sempre "refeições deste utilizador neste(s) dia(s)".
@Index(['userId', 'date'])
export class Meal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: Relation<User>;

  // nullable só por causa de refeições antigas (antes do login); as novas têm sempre dono.
  @Column({ type: 'uuid', nullable: true, select: false })
  userId!: string;

  // Dia da refeição (para o resumo diário).
  @Column({ type: 'date' })
  date!: string;

  @Column()
  type!: 'breakfast' | 'lunch' | 'dinner' | 'snack';

  @OneToMany(() => MealItem, (item) => item.meal, { cascade: true, eager: true })
  items!: Relation<MealItem[]>;

  @CreateDateColumn()
  createdAt!: Date;
}
