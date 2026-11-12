import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Food } from './food.entity.js';
import { User } from './user.entity.js';

/**
 * "Nome dado pelo Gemini" → alimento confirmado.
 * É por utilizador: as correções de uma pessoa não mudam as sugestões das outras.
 */
@Entity('food_aliases')
@Index(['userId', 'alias'], { unique: true })
export class FoodAlias {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  alias!: string;

  @ManyToOne(() => Food, { eager: true, onDelete: 'CASCADE' })
  food!: Relation<Food>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: Relation<User>;

  @Column({ type: 'uuid', nullable: true })
  userId!: string;

  @Column({ default: 1 })
  timesUsed!: number;
}
