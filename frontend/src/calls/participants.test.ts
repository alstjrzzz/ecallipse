import {describe, expect, it} from 'vitest';
import type {CallSession} from '../domain';
import {counterpartOf, resolveParty} from './participants';

const call = (overrides: Partial<CallSession>): CallSession => ({
  id: 'c1',
  callerId: 'alice',
  destination: {type: 'INTERNAL_USER', address: 'bob'},
  delivery: 'APP_REALTIME',
  status: 'RINGING',
  createdAt: '2026-09-21T00:00:00Z',
  acceptedAt: null,
  endedAt: null,
  ...overrides,
});

describe('call participants', () => {
  it('sees the destination from the caller and the caller from the callee', () => {
    expect(counterpartOf(call({}), 'alice')).toEqual({type: 'INTERNAL_USER', address: 'bob'});
    expect(counterpartOf(call({}), 'bob')).toEqual({type: 'INTERNAL_USER', address: 'alice'});
  });

  it('resolves an app user and a phone-only contact', () => {
    expect(resolveParty({type: 'INTERNAL_USER', address: 'bob'})).toMatchObject({name: 'Bob Lee', app: {sipExtension: '1001'}});
    expect(resolveParty({type: 'EXTERNAL_PHONE', address: '+82 2-555-0142'})).toMatchObject({name: 'Seoul Dental Clinic'});
  });

  it('falls back to the raw address for an unknown number', () => {
    expect(resolveParty({type: 'EXTERNAL_PHONE', address: '+1 555 0100'})).toMatchObject({name: '+1 555 0100', role: 'Phone call'});
  });
});
