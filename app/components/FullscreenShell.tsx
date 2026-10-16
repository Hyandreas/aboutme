import React from 'react';
import Navigation from './Navigation';
import HyacinthBackdrop from './hyacinth/HyacinthBackdrop';
import { getSiteChrome } from '@/lib/content';

interface FullscreenShellProps {
  children: React.ReactNode;
  className?: string;
  scrollScene?: boolean;
}

export default function FullscreenShell({
  children,
  className = '',
  scrollScene = false,
}: FullscreenShellProps) {
  const { navigation, hyacinth } = getSiteChrome();

  return (
    <div className={`hy-screen-shell${scrollScene ? ' hy-scroll-scene' : ''}`}>
      <HyacinthBackdrop bloomButtonLabel={hyacinth.bloom_button_label} scrollScene={scrollScene} />
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
