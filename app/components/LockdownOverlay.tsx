import ConstructionHyacinth from './ConstructionHyacinth';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getConfig, getSiteChrome, type LockdownContent } from '@/lib/content';

type LockdownOverlayProps = Pick<LockdownContent, 'title'> &
  Partial<Pick<LockdownContent, 'kicker' | 'message' | 'home_label'>>;

export default function LockdownOverlay({
  title,
  home_label: contentHomeLabel,
}: LockdownOverlayProps) {
  const { hyacinth } = getSiteChrome();
  const config = getConfig();
  const homeLabel = contentHomeLabel ?? config.lockdown_home_label;

  return (
    <section className="construction-screen" aria-labelledby="construction-title">
      <ConstructionHyacinth bloomButtonLabel={hyacinth.bloom_button_label} />
      <div className="construction-grid">
        <div className="construction-copy">
          <h1 id="construction-title">{title}</h1>
          <Link className="construction-primary" href="/">
            <span>{homeLabel}</span>
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
