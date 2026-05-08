import assert = require('assert');
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SendContactDto, StartTrialDto } from '../public.controller';

async function validatePayload<T extends object>(cls: new () => T, payload: Record<string, unknown>) {
  return validate(plainToInstance(cls, payload), { whitelist: true });
}

async function testStartTrialAcceptsCurrentMarketingPayload() {
  const errors = await validatePayload(StartTrialDto, {
    org: 'Acme IT',
    slug: 'acme-it',
    email: 'admin@example.com',
    country_iso: 'OTHER',
    captchaToken: 'captcha-token',
  });

  assert.deepEqual(errors.map((error) => error.property), []);
}

async function testStartTrialAcceptsLegacyMarketingAliases() {
  const errors = await validatePayload(StartTrialDto, {
    org_name: 'Acme IT',
    slug: 'acme-it',
    email: 'admin@example.com',
    country_iso: 'FR',
    captcha_token: 'captcha-token',
  });

  assert.deepEqual(errors.map((error) => error.property), []);
}

async function testContactAcceptsCaptchaAliases() {
  for (const captchaField of ['captchaToken', 'captcha_token']) {
    const errors = await validatePayload(SendContactDto, {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: 'Acme IT',
      message: 'Please contact me about KANAP.',
      [captchaField]: 'captcha-token',
    });

    assert.deepEqual(errors.map((error) => error.property), []);
  }
}

async function main() {
  await testStartTrialAcceptsCurrentMarketingPayload();
  await testStartTrialAcceptsLegacyMarketingAliases();
  await testContactAcceptsCaptchaAliases();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
