import { Controller, Get, Post } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @Post()
  ok(): { status: string } {
    return { status: 'ok' };
  }
}
