import { describe, expect, it } from 'vitest';
import { buildGaapRequest, validateGaapRequest } from '../../src/public/executor.js';
import { digest } from '../../scripts/contract-kernel/kernel.js';
import { executorFixture, nativeGaapFixture } from '../fixtures/executor-contract.js';
import { codes } from '../fixtures/contracts.js';

const supported = ['command_output', 'artifact', 'verification_attestation'] as const;
const unsupported = ['approval', 'tool_execution', 'resource_usage', 'interruption'] as const;

describe('packaged GAAP request interoperability', () => {
  it.each(unsupported)('rejects schema-valid %s as independent verification', async (type) => {
    const native = await nativeGaapFixture();
    native.request.required_verification.evidence_types = [type];
    expect(codes(validateGaapRequest(native.request))).toEqual(['GAAP_VERIFICATION_TYPE']);

    const fixture = await executorFixture();
    fixture.mapping.policy.evidence_mapping[0]!.evidence_types = [type];
    fixture.mapping.policy_digest = digest(fixture.mapping.policy);
    fixture.envelope.request.mapping_policy.digest = fixture.mapping.policy_digest;
    fixture.envelope.request.parameters.required_verification.evidence_types = [type];
    fixture.envelope.request_digest = digest(fixture.envelope.request);
    expect(codes(buildGaapRequest(fixture.envelope, fixture.mapping))).toEqual(['GAAP_VERIFICATION_TYPE']);
  });

  it.each(supported)('keeps %s available for independent verification', async (type) => {
    const native = await nativeGaapFixture();
    native.request.required_verification.evidence_types = [type];
    expect(validateGaapRequest(native.request).ok).toBe(true);
  });
});
