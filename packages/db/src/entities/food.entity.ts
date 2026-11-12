import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('foods')
// O mesmo alimento externo só existe uma vez (permite INSERT ... ON CONFLICT).
@Index(['source', 'externalId'], { unique: true })
export class Food {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  source!: 'insa' | 'usda' | 'off' | 'custom';

  @Column({ nullable: true })
  externalId?: string;

  @Column('float')
  kcalPer100g!: number;

  @Column('float')
  proteinPer100g!: number;

  @Column('float')
  carbsPer100g!: number;

  @Column('float')
  fatPer100g!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
