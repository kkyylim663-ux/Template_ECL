import { describe, expect, it } from 'vitest';
import { profileSchema, validate } from '@/lib/forms';

/**
 * T49's profile rules. The password block is all-or-nothing: any of the three
 * fields filled means the old one must be present, the new one 8+ characters
 * and the confirmation equal — every failure reports on `newPassword` with the
 * same key, which is the message the form renders.
 */
const base = {
  nickname: 'Ace',
  fullName: 'Demo Player',
  email: 'demo@example.test',
  mobile: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

describe('profile form rules', () => {
  it('accepts the profile with the password block untouched', () => {
    expect(validate(profileSchema, base).ok).toBe(true);
  });

  it('accepts a filled mobile number', () => {
    const result = validate(profileSchema, { ...base, mobile: '+60 12-345 6789' });
    expect(result.ok).toBe(true);
  });

  it('rejects a one-letter nickname', () => {
    const result = validate(profileSchema, { ...base, nickname: 'A' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.nickname).toBe('validation.nicknameRequired');
  });

  it('rejects a nickname over 24 characters', () => {
    const result = validate(profileSchema, { ...base, nickname: 'x'.repeat(25) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.nickname).toBe('validation.nicknameLong');
  });

  it('rejects a malformed email', () => {
    const result = validate(profileSchema, { ...base, email: 'demo@example' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBe('validation.emailInvalid');
  });

  it('rejects a malformed mobile', () => {
    const result = validate(profileSchema, { ...base, mobile: 'call me' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.mobile).toBe('validation.mobileInvalid');
  });

  it('requires the current password as soon as the block is touched', () => {
    const result = validate(profileSchema, { ...base, newPassword: 'LongEnough1', confirmPassword: 'LongEnough1' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.newPassword).toBe('validation.passwordAllThree');
  });

  it('requires eight characters', () => {
    const result = validate(profileSchema, {
      ...base,
      currentPassword: 'Test1234!',
      newPassword: 'Short1',
      confirmPassword: 'Short1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.newPassword).toBe('validation.passwordAllThree');
  });

  it('requires the confirmation to match', () => {
    const result = validate(profileSchema, {
      ...base,
      currentPassword: 'Test1234!',
      newPassword: 'LongEnough1',
      confirmPassword: 'LongEnough2',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.newPassword).toBe('validation.passwordAllThree');
  });

  it('accepts a complete password change', () => {
    const result = validate(profileSchema, {
      ...base,
      currentPassword: 'Test1234!',
      newPassword: 'LongEnough1',
      confirmPassword: 'LongEnough1',
    });
    expect(result.ok).toBe(true);
  });
});
