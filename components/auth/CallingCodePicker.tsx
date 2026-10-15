'use client';

import { useState } from 'react';
import { REGION_CODES, regionConfig, type RegionCode } from '@/config/brand';

/**
 * The `.calling-code` slab both auth forms put in front of a phone input: the
 * dial code with a scale-in list of the two markets, straight from the
 * reference's `calling-code__*` block.
 */
export function CallingCodePicker({
  value,
  onChange,
  label,
}: {
  value: RegionCode;
  onChange: (code: RegionCode) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="calling-code__wrapper">
      <button
        type="button"
        className="calling-code__container"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="calling-code">{regionConfig(value).dialCode}</span>
        <span className="calling-code__caret" aria-hidden="true" />
      </button>
      {open ? (
        <div className="calling-code__dropdown-wrapper">
          <div className="calling-code__dropdown open">
            {REGION_CODES.map((code) => (
              <button
                key={code}
                type="button"
                className={`calling-code__dropdown-container${code === value ? ' selected' : ''}`}
                onClick={() => {
                  onChange(code);
                  setOpen(false);
                }}
              >
                <span>
                  {regionConfig(code).label} ({regionConfig(code).dialCode})
                </span>
                <span className="calling-code__dropdown-tick" aria-hidden="true">
                  {'\u2713'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
