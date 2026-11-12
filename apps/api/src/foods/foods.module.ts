import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Food, FoodAlias } from '@repo/db';
import { FoodsService } from './foods.service.js';
import { FoodsController } from './foods.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Food, FoodAlias])],
  controllers: [FoodsController],
  providers: [FoodsService],
  exports: [FoodsService],
})
export class FoodsModule {}