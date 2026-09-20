import * as assert from 'node:assert/strict';
import { isValidHostname } from '../hostname.util';
import { AssetsValidationService } from '../services/assets-validation.service';

// Unit spec for the host name rule shared by the asset services and the Netbox
// mapper. No database and no HTTP, so it runs standalone under ts-node.

const label63 = 'a'.repeat(63);
const label64 = 'a'.repeat(64);

{
  // A single RFC 1123 label, which is what most assets carry.
  assert.equal(isValidHostname('srv01'), true);
  assert.equal(isValidHostname('a'), true);
  assert.equal(isValidHostname('par-esx-09'), true);
  assert.equal(isValidHostname(label63), true);
}

{
  // Several labels separated by single dots: a device name, not a DNS domain.
  assert.equal(isValidHostname('dl3.robot-15ms.ie2000'), true);
  assert.equal(isValidHostname('DL3.ROBOT-15MS.IE2000'), true);
  assert.equal(isValidHostname(`${label63}.${label63}`), true);
}

{
  // An empty label, in any position, is never a host name.
  assert.equal(isValidHostname(''), false);
  assert.equal(isValidHostname('a..b'), false);
  assert.equal(isValidHostname('.srv01'), false);
  assert.equal(isValidHostname('srv01.'), false);
  assert.equal(isValidHostname('.'), false);
}

{
  // A hyphen may not open or close a label, wherever the label sits.
  assert.equal(isValidHostname('-srv01'), false);
  assert.equal(isValidHostname('srv01-'), false);
  assert.equal(isValidHostname('dl3.-robot.ie2000'), false);
  assert.equal(isValidHostname('dl3.robot-.ie2000'), false);
}

{
  // Length: 63 characters per label, 253 for the whole host name.
  assert.equal(isValidHostname(label64), false);
  assert.equal(isValidHostname(`srv01.${label64}`), false);
  const tooLong = Array.from({ length: 4 }, () => label63).join('.'); // 255 characters
  assert.equal(tooLong.length, 255);
  assert.equal(isValidHostname(tooLong), false);
}

{
  // Characters outside letters, digits, hyphens and dots.
  assert.equal(isValidHostname('srv_01'), false);
  assert.equal(isValidHostname('srv 01'), false);
  assert.equal(isValidHostname('Switch #3 (spare)'), false);
  assert.equal(isValidHostname('srv01!'), false);
}

{
  // The asset service trims, treats no host name as acceptable, and otherwise
  // defers to the shared rule.
  const validation = new AssetsValidationService(null as never);
  assert.equal(validation.validateHostname(null), true);
  assert.equal(validation.validateHostname(''), true);
  assert.equal(validation.validateHostname('   '), true);
  assert.equal(validation.validateHostname('  dl3.robot-15ms.ie2000  '), true);
  assert.equal(validation.validateHostname('srv01'), true);
  assert.equal(validation.validateHostname('srv_01'), false);
  assert.equal(validation.validateHostname('a..b'), false);
}

{
  // computeFqdn: a dotted host name without a real domain is the FQDN as it
  // stands; with a domain, the DNS suffix is appended to the whole name.
  const settings = {
    getSettingsForWrite: async () => ({ domains: [{ code: 'corp', dns_suffix: 'corp.example' }] }),
  };
  const validation = new AssetsValidationService(settings as never);

  const run = async () => {
    assert.equal(await validation.computeFqdn('DL3.ROBOT-15MS.IE2000', null, 't'), 'dl3.robot-15ms.ie2000');
    assert.equal(await validation.computeFqdn('dl3.robot-15ms.ie2000', 'workgroup', 't'), 'dl3.robot-15ms.ie2000');
    assert.equal(await validation.computeFqdn('dl3.robot-15ms.ie2000', 'n-a', 't'), 'dl3.robot-15ms.ie2000');
    assert.equal(
      await validation.computeFqdn('dl3.robot-15ms.ie2000', 'corp', 't'),
      'dl3.robot-15ms.ie2000.corp.example',
    );
    assert.equal(await validation.computeFqdn('srv01', 'corp', 't'), 'srv01.corp.example');
    assert.equal(await validation.computeFqdn(null, 'corp', 't'), null);
  };

  run().then(
    () => console.log('asset-hostname spec passed'),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
