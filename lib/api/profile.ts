// MOCK-ONLY: 资料编辑存 localStorage（brand:profile:edits）、改密码打 /api/mock-auth/change-password（服务端内存覆盖）。接后台后改为 setProfile / setPassword 真实接口。
/**
 * Profile edits. The account payload is a read-only fixture, so the member's own
 * changes (nickname / email / mobile) live in localStorage and the profile page
 * overlays them on the fixture's values. Passwords are different: they go
 * through `/api/mock-auth/change-password`, which keeps an override in the
 * server's memory so a later sign-in with the new password succeeds.
 */
const KEY = 'brand:profile:edits';

/** Fired whenever the edits change, so open forms can follow. */
export const PROFILE_EVENT = 'brand:profile-change';

export interface ProfileEdits {
  nickname?: string;
  email?: string;
  mobile?: string;
}

export function readProfileEdits(): ProfileEdits {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const edits = parsed as ProfileEdits;
    return {
      nickname: typeof edits.nickname === 'string' ? edits.nickname : undefined,
      email: typeof edits.email === 'string' ? edits.email : undefined,
      mobile: typeof edits.mobile === 'string' ? edits.mobile : undefined,
    };
  } catch {
    return {};
  }
}

export function saveProfileEdits(edits: ProfileEdits): ProfileEdits {
  const next = { ...readProfileEdits(), ...edits };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: the page still reflects the save for this session.
  }
  window.dispatchEvent(new Event(PROFILE_EVENT));
  return next;
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/** Answers `{ ok }` — a wrong current password or a server error answers false. */
export async function changePassword(body: ChangePasswordBody): Promise<boolean> {
  const response = await fetch('/api/mock-auth/change-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.ok;
}
