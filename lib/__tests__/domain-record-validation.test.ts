/**
 * Property 31: Validator rejects malformed domain records
 *
 * Validates: Requirements 19.6
 */

import * as fc from 'fast-check';
import { validateDomainRecord, ValidationError } from '../validator';

// A simple schema representing a Profile-like record
const PROFILE_SCHEMA = {
  id: 'string',
  persona: 'string',
  onboarded: 'boolean',
};

// A simple schema representing a BehaviorEvent-like record
const EVENT_SCHEMA = {
  id: 'string',
  userId: 'string',
  eventType: 'string',
  sessionId: 'string',
  timestamp: 'string',
};

// ── Property 31: Validator rejects malformed domain records ──────
// Validates: Requirements 19.6

describe('Property 31: Validator rejects malformed domain records', () => {
  it('rejects objects with missing required fields', () => {
    fc.assert(
      fc.property(
        // Generate a valid-looking record then remove one required field
        fc.record({
          id: fc.uuid(),
          persona: fc.constantFrom('student', 'employee', 'fitness', 'irregular'),
          onboarded: fc.boolean(),
        }).chain((valid) =>
          fc.constantFrom(...Object.keys(PROFILE_SCHEMA)).map((fieldToRemove) => {
            const { [fieldToRemove]: _removed, ...incomplete } = valid as Record<string, unknown>;
            return incomplete;
          })
        ),
        (incompleteRecord) => {
          expect(() => validateDomainRecord(incompleteRecord, PROFILE_SCHEMA)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects objects with wrong-type fields', () => {
    fc.assert(
      fc.property(
        // Generate a record where one field has the wrong type
        fc.record({
          id: fc.integer(), // should be string
          persona: fc.constantFrom('student', 'employee'),
          onboarded: fc.boolean(),
        }),
        (wrongTypeRecord) => {
          expect(() =>
            validateDomainRecord(wrongTypeRecord as Record<string, unknown>, PROFILE_SCHEMA)
          ).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects null', () => {
    expect(() => validateDomainRecord(null, PROFILE_SCHEMA)).toThrow(ValidationError);
  });

  it('rejects arrays', () => {
    expect(() => validateDomainRecord([], PROFILE_SCHEMA)).toThrow(ValidationError);
  });

  it('rejects primitives', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (primitive) => {
          expect(() => validateDomainRecord(primitive, PROFILE_SCHEMA)).toThrow(ValidationError);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('rejects BehaviorEvent records with missing fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          userId: fc.uuid(),
          eventType: fc.string(),
          sessionId: fc.uuid(),
          timestamp: fc.string(),
        }).chain((valid) =>
          fc.constantFrom(...Object.keys(EVENT_SCHEMA)).map((fieldToRemove) => {
            const { [fieldToRemove]: _removed, ...incomplete } = valid as Record<string, unknown>;
            return incomplete;
          })
        ),
        (incompleteRecord) => {
          expect(() => validateDomainRecord(incompleteRecord, EVENT_SCHEMA)).toThrow(ValidationError);
        }
      ),
      { numRuns: 100 }
    );
  });
});
