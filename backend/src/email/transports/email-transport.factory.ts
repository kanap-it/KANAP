import { Logger } from '@nestjs/common';
import {
  buildDisabledEmailMessage,
  describeSmtpConfigurationIssue,
  hasAnySmtpEnvConfigured,
  isSingleTenantEmailDeployment,
  readResendApiKey,
  readResendFromEmail,
  readSmtpConfig,
} from '../email-config';
import type { EmailTransport } from './email-transport.interface';
import { DisabledEmailTransport } from './disabled-email.transport';
import { ResendTransport } from './resend.transport';
import { SmtpTransport } from './smtp.transport';

export function createEmailTransport(logger: Logger): EmailTransport {
  const singleTenant = isSingleTenantEmailDeployment();
  const resendApiKey = readResendApiKey();

  if (singleTenant) {
    const smtpIssue = describeSmtpConfigurationIssue();
    const smtpConfig = readSmtpConfig();
    if (smtpConfig) {
      if (smtpConfig.passwordEnvName === 'SMTP_PASS') {
        logger.warn('SMTP_PASS is deprecated; use SMTP_PASSWORD instead.');
      }
      logger.log(`Email transport selected: smtp (${smtpConfig.host}:${smtpConfig.port}, secure=${smtpConfig.secure})`);
      return new SmtpTransport(smtpConfig);
    }

    if (smtpIssue) {
      logger.warn(`SMTP configuration incomplete; ${smtpIssue}`);
    }

    if (resendApiKey) {
      logger.log('Email transport selected: resend');
      return new ResendTransport(resendApiKey, readResendFromEmail());
    }
  } else {
    if (hasAnySmtpEnvConfigured()) {
      logger.warn('SMTP configuration is ignored in multi-tenant deployments; cloud email remains on Resend.');
    }

    if (resendApiKey) {
      logger.log('Email transport selected: resend');
      return new ResendTransport(resendApiKey, readResendFromEmail());
    }
  }

  logger.warn('No outbound email transport configured; email sending is disabled.');
  return new DisabledEmailTransport(buildDisabledEmailMessage());
}
