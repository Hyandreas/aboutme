import React from 'react';

interface KickerProps {
  numeral?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Kicker({ numeral, children, className = '' }: KickerProps) {
  return (
    <span className={`kicker inline-flex items-center gap-3 ${className}`}>
      {numeral && (
        <span className="text-bone/50" aria-hidden="true">
          {numeral}
        </span>
      )}
      {numeral && <span className="h-px w-6 bg-bone/20" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
