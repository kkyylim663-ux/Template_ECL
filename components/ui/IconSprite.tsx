import { ICON_PATHS, type IconName } from './icon-paths';

/**
 * One <symbol> per icon. Icons elsewhere render `<use href="#i-name" />`, so the
 * path data ships a single time per page instead of once per icon instance.
 *
 * `only` narrows the sprite to a subset (T26): the root layout ships the shell
 * set, and a component that needs an icon outside it renders its own sprite next
 * to the icon — one mount per page, so the ids stay unique.
 */
export function IconSprite({ only }: { only?: readonly IconName[] }) {
  const names = only ?? (Object.keys(ICON_PATHS) as IconName[]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      {names.map((name) => (
        <symbol key={name} id={`i-${name}`} viewBox="0 0 24 24">
          {ICON_PATHS[name].map((d, index) => (
            <path key={index} d={d} />
          ))}
        </symbol>
      ))}
    </svg>
  );
}
