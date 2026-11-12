import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { WeightLog } from '@repo/db';
import {
  isoDateSchema,
  weightQuerySchema,
  weightSchema,
  type UserDto,
  type WeightEntry,
  type WeightInput,
  type WeightQuery,
} from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';

const toEntry = (l: WeightLog): WeightEntry => ({ date: l.date, kg: Math.round(l.kg * 10) / 10 });

@Injectable()
export class WeightService {
  constructor(@InjectRepository(WeightLog) private readonly repo: Repository<WeightLog>) {}

  /** Registos dos últimos `days` dias, do mais antigo para o mais recente (pronto para o gráfico). */
  async list(userId: string, { days }: WeightQuery): Promise<WeightEntry[]> {
    const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    const logs = await this.repo.find({ where: { userId, date: MoreThanOrEqual(since) }, order: { date: 'ASC' } });
    return logs.map(toEntry);
  }

  /** Um registo por dia: voltar a registar no mesmo dia substitui o valor. */
  async upsert(userId: string, { date, kg }: WeightInput): Promise<WeightEntry> {
    await this.repo
      .createQueryBuilder()
      .insert()
      .values({ userId, date, kg })
      .orUpdate(['kg', 'updatedAt'], ['userId', 'date'])
      .execute();
    return toEntry(await this.repo.findOneByOrFail({ userId, date }));
  }

  async remove(userId: string, date: string) {
    await this.repo.delete({ userId, date });
  }
}

/**
 * Prefixo: /weight (exige login)
 * - GET    /weight?days=90  → registos (mais antigo primeiro)
 * - PUT    /weight          → { date, kg } regista/substitui o peso do dia
 * - DELETE /weight/:date    → apaga o registo do dia
 */
@Controller('weight')
export class WeightController {
  constructor(private readonly weight: WeightService) {}

  @Get()
  list(@CurrentUser() user: UserDto, @Query({ schema: weightQuerySchema }) query: WeightQuery) {
    return this.weight.list(user.id, query);
  }

  @Put()
  upsert(@CurrentUser() user: UserDto, @Body({ schema: weightSchema }) body: WeightInput) {
    return this.weight.upsert(user.id, body);
  }

  @Delete(':date')
  @HttpCode(204)
  remove(@CurrentUser() user: UserDto, @Param('date') date: string) {
    if (!isoDateSchema.safeParse(date).success) throw new BadRequestException('Data inválida.');
    return this.weight.remove(user.id, date);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WeightLog])],
  providers: [WeightService],
  controllers: [WeightController],
})
export class WeightModule {}
