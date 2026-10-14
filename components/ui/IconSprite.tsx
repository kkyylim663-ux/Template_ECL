import { ICON_PATHS } from './icon-paths';

/**
 * One <symbol> per icon, mounted once in the root layout. Icons elsewhere render
 * `<use href="#i-name" />`, so the path data ships a single time per page instead
 * of once per icon instance.
 */
export function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
    >
      {Object.entries(ICON_PATHS).map(([name, paths]) => (
        <symbol key={name} id={`i-${name}`} viewBox="0 0 24 24">
          {paths.map((d, index) => (
            <path key={index} d={d} />
          ))}
        </symbol>
      ))}
    </svg>
  );
}
