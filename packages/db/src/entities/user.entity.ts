import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Guardado sempre em minúsculas (ver AuthService). */
  @Column({ unique: true })
  email!: string;

  /** Formato `scrypt$N$r$p$salt$hash` — nunca a password em claro. */
  @Column({ select: false })
  passwordHash!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
