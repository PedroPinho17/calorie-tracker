import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Goal } from '@repo/db';
import { GoalsService } from './goals.service.js';
import { GoalsController } from './goals.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Goal])],
  providers: [GoalsService],
  controllers: [GoalsController],
})
export class GoalsModule {}
