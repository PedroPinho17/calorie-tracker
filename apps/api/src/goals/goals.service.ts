import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from '@repo/db';
import type { GoalInput } from '@repo/shared';

const toDto = ({ kcal, protein, carbs, fat, waterMl }: Goal): GoalInput => ({
  kcal,
  protein,
  carbs,
  fat,
  waterMl,
});

@Injectable()
export class GoalsService {
  constructor(@InjectRepository(Goal) private readonly repo: Repository<Goal>) {}

  /** Metas do utilizador; se ainda não tiver, ficam os valores por defeito. */
  private async findOrCreate(userId: string) {
    const goal = await this.repo.findOneBy({ userId });
    if (goal) return goal;
    // orIgnore: dois pedidos em paralelo não falham no índice único de userId.
    await this.repo.createQueryBuilder().insert().values({ userId }).orIgnore().execute();
    return this.repo.findOneByOrFail({ userId });
  }

  async get(userId: string) {
    return toDto(await this.findOrCreate(userId));
  }

  async update(userId: string, input: GoalInput) {
    const goal = await this.findOrCreate(userId);
    return toDto(await this.repo.save(Object.assign(goal, input)));
  }
}
