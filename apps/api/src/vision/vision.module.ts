import { Module } from '@nestjs/common';
import { FoodsModule } from '../foods/foods.module.js';
import { VisionService } from './vision.service.js';
import { VisionController } from './vision.controller.js';

/**
 * Módulo Vision: foto → Gemini → USDA.
 * FoodsService está nos providers para o VisionService o injectar
 * (o controller não precisa de conhecer a USDA).
 */
@Module({
  imports: [FoodsModule],
  providers: [VisionService],
  controllers: [VisionController],
})
export class VisionModule {}
