import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [PrismaModule, AuditService],
})
export class CommonModule {}
