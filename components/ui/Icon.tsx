import type { SVGProps } from 'react';
import type { IconName } from './icon-paths';

/** Re-exported so callers can type an icon slot without reaching for the sprite. */
export type { IconName } from './icon-paths';

/**
 * Icons render through one <symbol> sprite (components/ui/IconSprite.tsx, mounted
 * once in the root layout), so path data ships once per page rather than once per
 * icon. Presentation lives in the `.icon` rule in app/globals.css: keeping ten
 * stroke attributes off every element saves roughly 15 KB of markup on a page
 * that renders a full navigation shell (and it does, on every page).
 */
export function Icon({ name, size = 24, strokeWidth, className, style }: IconProps) {
  const merged = strokeWidth ? { ...style, strokeWidth } : style;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className ? `icon ${className}` : 'icon'}
      style={merged}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#i-${name}`} />
    </svg>
  );
}

type IconProps = {
  name: IconName;
  size?: number;
  /** Only pass this to override the `.icon` stroke width. */
  strokeWidth?: number;
} & Omit<SVGProps<SVGSVGElement>, 'name' | 'width' | 'height' | 'children' | 'fill' | 'stroke'>;
