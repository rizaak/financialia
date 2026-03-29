import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PatchInstallmentPlanDto } from './dto/patch-installment-plan.dto';
import { InstallmentPlansService } from './installment-plans.service';

@Controller('installment-plans')
export class InstallmentPlansController {
  constructor(private readonly installmentPlans: InstallmentPlansService) {}

  @Get()
  listAllActive(@CurrentUser('id') userId: string) {
    return this.installmentPlans.listAllActiveForUser(userId);
  }

  @Patch(':planId')
  patch(
    @CurrentUser('id') userId: string,
    @Param('planId') planId: string,
    @Body() dto: PatchInstallmentPlanDto,
  ) {
    return this.installmentPlans.updatePlan(userId, planId, dto);
  }
}
