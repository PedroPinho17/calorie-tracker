import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createMealSchema,
  dayQuerySchema,
  historyQuerySchema,
  updateMealItemSchema,
  type CreateMealInput,
  type HistoryQuery,
  type UpdateMealItemInput,
  type UserDto,
} from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { MealsService } from './meals.service.js';

/**
 * Prefixo: /meals (exige login; cada utilizador só vê as suas)
 * - POST   /meals                        → guarda uma refeição (macros calculados no servidor)
 * - GET    /meals/day?date=...           → refeições desse dia + total
 * - GET    /meals/history?end=...&days=7 → total por dia
 * - GET    /meals/recent                 → últimos alimentos usados
 * - PATCH  /meals/:mealId/items/:itemId → troca o alimento e/ou as gramas de um item
 * - DELETE /meals/:id                    → apaga uma refeição
 */
@Controller('meals')
export class MealsController {
  constructor(private readonly meals: MealsService) {}

  @Post()
  create(@CurrentUser() user: UserDto, @Body({ schema: createMealSchema }) body: CreateMealInput) {
    return this.meals.create(user.id, body);
  }

  @Get('day')
  day(@CurrentUser() user: UserDto, @Query({ schema: dayQuerySchema }) query: { date: string }) {
    return this.meals.day(user.id, query.date);
  }

  @Get('history')
  history(
    @CurrentUser() user: UserDto,
    @Query({ schema: historyQuerySchema }) query: HistoryQuery,
  ) {
    return this.meals.history(user.id, query);
  }

  @Get('recent')
  recent(@CurrentUser() user: UserDto) {
    return this.meals.recent(user.id);
  }

  @Patch(':mealId/items/:itemId')
  updateItem(
    @CurrentUser() user: UserDto,
    @Param('mealId', ParseUUIDPipe) mealId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body({ schema: updateMealItemSchema }) body: UpdateMealItemInput,
  ) {
    return this.meals.updateItem(user.id, mealId, itemId, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: UserDto, @Param('id', ParseUUIDPipe) id: string) {
    return this.meals.remove(user.id, id);
  }
}
