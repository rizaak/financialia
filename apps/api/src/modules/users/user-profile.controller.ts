import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService, type UserProfileResponse } from './users.service';

@Controller('me')
export class UserProfileController {
  constructor(private readonly users: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.users.getProfile(userId);
  }

  @Patch('profile')
  patchProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    return this.users.updateProfile(user.id, dto);
  }
}
