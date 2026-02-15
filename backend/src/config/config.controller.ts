import { Controller, Get } from '@nestjs/common';
import { Features } from './features';

@Controller('config')
export class ConfigController {
  @Get('public')
  getPublicConfig() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../../package.json');
    return {
      deploymentMode: Features.DEPLOYMENT_MODE,
      features: {
        billing: Features.STRIPE_BILLING,
        sso: Features.ENTRA_SSO,
        email: Features.EMAIL_ENABLED,
      },
      version,
    };
  }
}
