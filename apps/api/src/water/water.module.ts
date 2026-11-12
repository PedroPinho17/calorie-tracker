import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaterLog } from '@repo/db';
import { addWaterSchema, dayQuerySchema, type AddWaterInput, type UserDto, type WaterDay } from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';

@Injectable()
export class WaterService {
  constructor(@InjectRepository(WaterLog) private readonly repo: Repository<WaterLog>) {}

  async day(userId: string, date: string): Promise<WaterDay> {
    const logs = await this.repo.find({ where: { userId, date }, order: { createdAt: 'ASC' } });
    return {
      date,
      totalMl: logs.reduce((sum, l) => sum + l.ml, 0),
      entries: logs.map((l) => ({ id: l.id, ml: l.ml, createdAt: l.createdAt.toISOString() })),
    };
  }

  async add(userId: string, { date, ml }: AddWaterInput) {
    await this.repo.insert({ userId, date, ml });
    return this.day(userId, date);
  }

  async remove(userId: string, id: string) {
    const log = await this.repo.findOne({ where: { id, userId }, select: { id: true, date: true } });
    if (!log) throw new NotFoundException('Registo não encontrado');
    await this.repo.delete({ id, userId });
    return this.day(userId, log.date);
  }
}

/**
 * Prefixo: /water (exige login)
 * - GET    /water?date=YYYY-MM-DD → total e registos do dia
 * - POST   /water                 → { date, ml } acrescenta (ex.: um copo)
 * - DELETE /water/:id             → apaga um registo (ex.: desfazer)
 */
@Controller('water')
export class WaterController {
  constructor(private readonly water: WaterService) {}

  @Get()
  day(@CurrentUser() user: UserDto, @Query({ schema: dayQuerySchema }) query: { date: string }) {
    return this.water.day(user.id, query.date);
  }

  @Post()
  add(@CurrentUser() user: UserDto, @Body({ schema: addWaterSchema }) body: AddWaterInput) {
    return this.water.add(user.id, body);
  }

  @Delete(':id')
  @HttpCode(200)
  remove(@CurrentUser() user: UserDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.water.remove(user.id, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WaterLog])],
  providers: [WaterService],
  controllers: [WaterController],
})
export class WaterModule {}
