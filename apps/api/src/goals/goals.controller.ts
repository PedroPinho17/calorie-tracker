import { Body, Controller, Get, Put } from '@nestjs/common';
import { goalSchema, type GoalInput, type UserDto } from '@repo/shared';
import { CurrentUser } from '../auth/auth.decorators.js';
import { GoalsService } from './goals.service.js';

/** GET /goals mostra as metas do utilizador; PUT /goals altera-as. */
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  get(@CurrentUser() user: UserDto) {
    return this.goals.get(user.id);
  }

  @Put()
  update(@CurrentUser() user: UserDto, @Body({ schema: goalSchema }) body: GoalInput) {
    return this.goals.update(user.id, body);
  }
}
