import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { CurrentUser } from './current-user.decorator';
import { UpdateMeDto } from './dto/update-me.dto';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Patch()
  patchMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto): Promise<User> {
    return this.users.updateMe(user.id, dto);
  }
}
