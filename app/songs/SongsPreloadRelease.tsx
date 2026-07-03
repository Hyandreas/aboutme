'use client';

import { useEffect } from 'react';

export default function SongsPreloadRelease() {
  useEffect(() => {
    document.dispatchEvent(new CustomEvent('hy:songs-embeds-visible'));
  }, []);

  return null;
}

