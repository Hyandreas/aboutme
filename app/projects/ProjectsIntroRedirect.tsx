'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { coldOpenCanPlay } from '../components/coldopen/coldOpenState';

interface ProjectsIntroRedirectProps {
  children: React.ReactNode;
}

export default function ProjectsIntroRedirect({ children }: ProjectsIntroRedirectProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (coldOpenCanPlay()) {
      router.replace('/');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return null;

  return <>{children}</>;
}
