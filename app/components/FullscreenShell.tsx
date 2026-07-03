import React from 'react';
import Navigation from './Navigation';
import HyacinthBackdrop from './hyacinth/HyacinthBackdrop';
import { getSiteChrome } from '@/lib/content';

interface FullscreenShellProps {
  children: React.ReactNode;
  className?: string;
}

export default function FullscreenShell({
  children,
  className = '',
}: FullscreenShellProps) {
  const { navigation, hyacinth } = getSiteChrome();

  return (
    <div className="hy-screen-shell">
      <HyacinthBackdrop bloomButtonLabel={hyacinth.bloom_button_label} />
      <Navigation
        brand={navigation.brand}
        items={navigation.items}
        mobileOpenLabel={navigation.mobile_open_label}
        mobileCloseLabel={navigation.mobile_close_label}
      />
      <main className={`hy-screen-main ${className}`}>{children}</main>
    </div>
  );
}
