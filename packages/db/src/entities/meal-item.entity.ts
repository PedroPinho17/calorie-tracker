import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { Meal } from './meal.entity.js';
import { Food } from './food.entity.js';

@Entity('meal_items')
export class MealItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Meal, (meal) => meal.items, { onDelete: 'CASCADE' })
  meal!: Relation<Meal>;

  @ManyToOne(() => Food, { eager: true })
  food!: Relation<Food>;

  @Column('float')
  grams!: number;

  // Valores já calculados no momento (ficam fixos mesmo que o Food mude).
  @Column('float') kcal!: number;
  @Column('float') protein!: number;
  @Column('float') carbs!: number;
  @Column('float') fat!: number;
}
