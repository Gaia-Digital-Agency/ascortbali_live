// Placeholder DEMS icons rendered inline as SVG so the active (gold circle)
// and dim (gray circle) states are pure CSS — no two-asset swap. Replace the
// path data per icon with the final artwork when the source SVGs land.
//
// D = Dating (heart pierced by arrow)
// E = Escort (two figures walking together)
// M = Massage (hands working on a body on a table)
// S = Sugar babies (smiling person with card + gift)

import type { ReactElement, ReactNode } from "react";

type DemsLetter = "D" | "E" | "M" | "S";

const ACTIVE_BG = "#c9a24d"; // brand-gold
const DIM_BG = "#2f2c28"; // muted charcoal — matches the dim sample
const LINE = "#1a1a1a";

function IconCircle({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="15" fill={active ? ACTIVE_BG : DIM_BG} />
      <g
        stroke={LINE}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
    </svg>
  );
}

function DatingIcon({ active }: { active: boolean }) {
  return (
    <IconCircle active={active}>
      {/* heart */}
      <path d="M16 24c-1-.6-6-3.8-6-9a3.2 3.2 0 0 1 6-1.4 3.2 3.2 0 0 1 6 1.4c0 1.4-.4 2.6-1 3.6" />
      {/* arrow shaft + head + fletching */}
      <line x1="9" y1="23" x2="23" y2="9" />
      <polyline points="19,8 23,8 23,12" />
      <polyline points="9,19 9,23 13,23" />
    </IconCircle>
  );
}

function EscortIcon({ active }: { active: boolean }) {
  return (
    <IconCircle active={active}>
      {/* two heads */}
      <circle cx="12" cy="9" r="2" />
      <circle cx="20" cy="9" r="2" />
      {/* two bodies + legs walking */}
      <path d="M12 11v6l-3 5" />
      <path d="M12 17l3 5" />
      <path d="M20 11v6l-3 5" />
      <path d="M20 17l3 5" />
    </IconCircle>
  );
}

function MassageIcon({ active }: { active: boolean }) {
  return (
    <IconCircle active={active}>
      {/* table */}
      <line x1="5" y1="22" x2="27" y2="22" />
      <line x1="8" y1="22" x2="8" y2="26" />
      <line x1="24" y1="22" x2="24" y2="26" />
      {/* body lying */}
      <circle cx="9" cy="19" r="1.5" />
      <path d="M11 20c2-.4 6-.4 11-.4" />
      {/* two hands above */}
      <path d="M15 11c0 2 .5 3.5 2 4.5" />
      <path d="M19 11c0 2-.5 3.5-2 4.5" />
      <path d="M14 10c.4-.6 1.6-.6 2 0M18 10c.4-.6 1.6-.6 2 0" />
    </IconCircle>
  );
}

function SugarIcon({ active }: { active: boolean }) {
  return (
    <IconCircle active={active}>
      {/* head */}
      <circle cx="15" cy="10" r="3" />
      {/* smile */}
      <path d="M13.5 10.5c.5.6 1.5.6 2 0" />
      {/* shoulders / body */}
      <path d="M9 22c0-3 2.5-5 6-5s6 2 6 5" />
      {/* credit card (left hand) */}
      <rect x="5" y="17" width="6" height="4" rx="0.5" />
      <line x1="5" y1="18.5" x2="11" y2="18.5" />
      {/* gift (right hand) */}
      <rect x="20" y="17" width="5" height="5" />
      <line x1="22.5" y1="17" x2="22.5" y2="22" />
      <line x1="20" y1="19.5" x2="25" y2="19.5" />
    </IconCircle>
  );
}

const ICON_BY_LETTER: Record<DemsLetter, (props: { active: boolean }) => ReactElement> = {
  D: DatingIcon,
  E: EscortIcon,
  M: MassageIcon,
  S: SugarIcon,
};

export function DemsIcon({ letter, active }: { letter: DemsLetter; active: boolean }) {
  const Component = ICON_BY_LETTER[letter];
  return <Component active={active} />;
}
