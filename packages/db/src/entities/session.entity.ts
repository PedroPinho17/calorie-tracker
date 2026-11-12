import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { User } from './user.entity.js';

/**
 * Sessão de login. O cookie leva um token aleatório; aqui só fica o SHA-256 dele,
 * por isso uma fuga da BD não permite entrar nas contas.
 */
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column()
  tokenHash!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  user!: Relation<User>;

  @Column()
  userId!: string;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
