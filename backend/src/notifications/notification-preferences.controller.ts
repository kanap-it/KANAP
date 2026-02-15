import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesData } from './notifications.constants';
import { ScheduledNotificationsService } from './scheduled-notifications.service';
import { Features } from '../config/features';
import { throwFeatureDisabled } from '../common/feature-gates';

@UseGuards(JwtAuthGuard)
@Controller('users/me/notification-preferences')
export class NotificationPreferencesController {
  constructor(
    private readonly svc: NotificationPreferencesService,
    private readonly scheduledSvc: ScheduledNotificationsService,
  ) {}

  @Get()
  async get(@Req() req: any): Promise<NotificationPreferencesData> {
    const userId = req.user?.sub;
    const tenantId = req.tenant?.id;

    if (!userId || !tenantId) {
      throw new Error('User or tenant not found');
    }

    return this.svc.getForUser(userId, tenantId, { manager: req?.queryRunner?.manager });
  }

  @Patch()
  async update(
    @Body() body: Partial<NotificationPreferencesData>,
    @Req() req: any,
  ): Promise<NotificationPreferencesData> {
    const userId = req.user?.sub;
    const tenantId = req.tenant?.id;

    if (!userId || !tenantId) {
      throw new Error('User or tenant not found');
    }

    return this.svc.updateForUser(userId, tenantId, body, userId, { manager: req?.queryRunner?.manager });
  }

  @Post('test-weekly-review')
  async testWeeklyReview(@Req() req: any): Promise<{ success: boolean; message: string }> {
    if (!Features.EMAIL_ENABLED) throwFeatureDisabled('email');
    const userId = req.user?.sub;
    const tenantId = req.tenant?.id;

    if (!userId || !tenantId) {
      throw new Error('User or tenant not found');
    }

    return this.scheduledSvc.sendTestWeeklyReview(userId, tenantId);
  }
}
