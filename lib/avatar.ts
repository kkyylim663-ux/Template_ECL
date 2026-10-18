/**
 * The member's face in the account area. The reference lets the server name the
 * file (`account-menu__profile-avatar` carries
 * `/static/images/avatar/nba-players/<n>.png` in the snapshot); the fixture has
 * no avatar field, so the username picks one of the eight generated
 * `/avatar/avatar-*.webp` frames — stable per member, and the shell and the
 * profile hero always agree.
 */
const AVATAR_COUNT = 8;

export function avatarSrc(username: string): string {
  const sum = username.split('').reduce((total, ch) => total + ch.charCodeAt(0), 0);
  return `/avatar/avatar-${(sum % AVATAR_COUNT) + 1}.webp`;
}
