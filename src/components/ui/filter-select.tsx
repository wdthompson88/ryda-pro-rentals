// <FilterSelect> — branded <select> primitive with the same chevron
// SVG used across markets/boats/rental listings.
//
// Audit found the same ~950-char inline-SVG `bg-[url('data:image/svg+xml...')]`
// pattern duplicated three times:
//   - markets-listings.tsx:388
//   - boats-listings.tsx:324
//   - rental-listings.tsx:569
//
// Pulled into one component. Listings pages import this instead of
// re-implementing the chevron + base styling.

import type { ChangeEvent, ReactNode } from "react";

const CHEVRON_BG =
  "appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M3%204.5L6%207.5L9%204.5%22%20stroke%3D%22%239A9590%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat pr-9";

type FilterSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string } | string>;
  /** Defaults to "Any". */
  emptyLabel?: string;
  className?: string;
  ariaLabel?: string;
};

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  emptyLabel = "Any",
  className = "",
  ariaLabel,
}: FilterSelectProps): ReactNode {
  return (
    <label className={`block ${className}`}>
      {label ? (
        <span className="block text-[10px] font-medium uppercase tracking-[0.2em] text-mute">
          {label}
        </span>
      ) : null}
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        aria-label={ariaLabel ?? label}
        className={`${label ? "mt-2" : ""} h-11 w-full rounded-xl border border-rule bg-cream pl-4 text-sm text-ink focus:border-ink focus:outline-none ${CHEVRON_BG}`}
      >
        <option value="">{emptyLabel}</option>
        {options.map((opt) => {
          const o =
            typeof opt === "string" ? { value: opt, label: opt } : opt;
          return (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
