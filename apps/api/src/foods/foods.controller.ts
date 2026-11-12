import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  confirmFoodSchema,
  searchQuerySchema,
  type ConfirmFoodInput,
  type UserDto,
} from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { FoodsService } from './foods.service.js';

/**
 * Prefixo: /foods (exige login)
 * - GET  /foods/search?q=egg        → pesquisa na USDA
 * - GET  /foods/barcode/:code       → produto embalado (Open Food Facts)
 * - POST /foods/confirm             → guarda a correção do utilizador (alias → alimento)
 */
@Controller('foods')
export class FoodsController {
  constructor(private readonly foods: FoodsService) {}

  @Get('search')
  search(@Query({ schema: searchQuerySchema }) query: { q: string }) {
    return this.foods.search(query.q);
  }

  @Get('barcode/:code')
  barcode(@Param('code') code: string) {
    return this.foods.barcode(code);
  }

  @Post('confirm')
  confirm(
    @CurrentUser() user: UserDto,
    @Body({ schema: confirmFoodSchema }) body: ConfirmFoodInput,
  ) {
    return this.foods.confirm(user.id, body.alias, body.picked);
  }
}
