import { Module } from '@nestjs/common';
import { CommonModule } from '@common/common.module';
import { AuditLogService } from './audit-log.service';
import { UserProfileController } from './user-profile.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CommonModule],
  controllers: [UserProfileController],
  providers: [UsersService, AuditLogService],
  exports: [UsersService, AuditLogService],
})
export class UsersModule {}
