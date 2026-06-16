'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

/**
 * Renders its children on every route EXCEPT those listed in `hideOn`
 * (a single path or an array of paths; each matches the path itself and
 * anything nested under it).
 *
 * Used in the root layout to suppress site-wide decorative chrome where it
 * gets in the way: the whole set on the self-contained home scene (which has
 * its own atmosphere and needs an unlocked scroll + visible cursor), and the
 * entrance/route curtains on /projects (they delayed first paint + locked
 * scroll, which is what made that page feel slow to load).
 *
 * Calls a single hook before any conditional return, so it stays
 * rules-of-hooks safe even though the layout persists across client nav.
 */
export default function RouteGate({
  children,
  hideOn,
}: {
  children: React.ReactNode;
  hideOn: string | string[];
}) {
  const pathname = usePathname();
  const paths = Array.isArray(hideOn) ? hideOn : [hideOn];
  const hidden = !!pathname && paths.some((h) => pathname === h || pathname.startsWith(h + '/'));
  if (hidden) {
    return null;
  }
  return <>{children}</>;
}
