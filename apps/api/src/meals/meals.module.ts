import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meal, MealItem } from '@repo/db';
import { MealsService } from './meals.service.js';
import { MealsController } from './meals.controller.js';
import { FoodsModule } from '../foods/foods.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Meal, MealItem]), FoodsModule],
  providers: [MealsService],
  controllers: [MealsController],
})
export class MealsModule {}