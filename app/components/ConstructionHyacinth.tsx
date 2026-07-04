'use client';

import dynamic from 'next/dynamic';

const HyacinthBackdrop = dynamic(() => import('./hyacinth/HyacinthBackdrop'), {
  ssr: false,
});

interface ConstructionHyacinthProps {
  bloomButtonLabel: string;
}

export default function ConstructionHyacinth({ bloomButtonLabel }: ConstructionHyacinthProps) {
  return (
    <HyacinthBackdrop
      bloomButtonLabel={bloomButtonLabel}
      className="hy-construction"
      lookOffset={0}
      transparentBackground
    />
  );
}
