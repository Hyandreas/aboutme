import type { Metadata } from 'next';
import FullscreenShell from '../components/FullscreenShell';
import LockdownOverlay from '../components/LockdownOverlay';
import { getAboutContent, getDisabledPage, getDisabledPageMetadata } from '@/lib/content';

export function generateMetadata(): Metadata {
  const disabledMetadata = getDisabledPageMetadata('/about');
  if (disabledMetadata) return disabledMetadata;

  const content = getAboutContent();
  return {
    title: content.meta_title,
    description: content.meta_description,
  };
}

export default function AboutPage() {
  const lockdown = getDisabledPage('/about');
  const content = getAboutContent();

  if (lockdown) {
    return <LockdownOverlay {...lockdown} />;
  }

  return (
    <FullscreenShell className="about-screen">
      <section className="screen-spread about-spread" aria-labelledby="about-title">
        <div className="screen-copy about-copy">
          <p className="screen-kicker">{content.kicker}</p>
          <h1 id="about-title" className="screen-title">
            {content.title}
          </h1>
          <p className="screen-lede">
            {content.lede}
          </p>
          <div className="about-meta" aria-label={content.meta_label}>
            {content.meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          {content.now.length > 0 && (
            <div className="about-now" aria-label={content.now_label}>
              <p>{content.now_label}</p>
              {content.now.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </div>

        <div className="interest-ledger" aria-label={content.interests_label}>
          <p className="ledger-label">{content.interests_label}</p>
          {content.interests.slice(0, 6).map((interest, index) => (
            <div className="interest-row" key={interest.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{interest.title}</strong>
              <em>{interest.note}</em>
            </div>
          ))}
        </div>
      </section>
    </FullscreenShell>
  );
}
