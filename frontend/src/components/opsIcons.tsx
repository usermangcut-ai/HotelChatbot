import type { ReactNode } from "react";

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">{children}</svg>
);

/** Biểu tượng chép nguyên từ mockup staff/admin. */
export const ICONS = {
  queue: svg(<path d="M4 6h16M4 12h16M4 18h10" />),
  restaurant: svg(<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 4-3 7h3v11" />),
  spa: svg(<path d="M12 21c-4 0-7-3-7-7 3 0 5 1 7 3 2-2 4-3 7-3 0 4-3 7-7 7zM12 17c-2-3-2-7 0-11 2 4 2 8 0 11z" />),
  support: svg(<path d="M4 13a8 8 0 0 1 16 0M4 13v3a2 2 0 0 0 2 2h1v-6H6M20 13v3a2 2 0 0 1-2 2h-1v-6h1" />),
  overview: svg(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>),
  bookings: svg(<><rect x="3" y="5" width="18" height="16" rx="1" /><path d="M3 10h18M8 3v4M16 3v4" /></>),
  newAccount: svg(<><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c1-3.5 3.6-5.5 6.5-5.5 1.6 0 3 .5 4.1 1.5M18 14v6M15 17h6" /></>),
  accounts: svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .8 3.2 2.8 3.5 5.5" /></>),
} satisfies Record<string, ReactNode>;
