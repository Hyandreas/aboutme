import type { Metadata } from 'next';
import FullscreenShell from '../components/FullscreenShell';
import { getSongsContent } from '@/lib/content';
import SongsPreloadRelease from './SongsPreloadRelease';

export function generateMetadata(): Metadata {
  const content = getSongsContent();
  return {
    title: content.meta_title,
    description: content.meta_description,
  };
}

export default function SongsPage() {
  const content = getSongsContent();

  return (
    <FullscreenShell className="songs-screen">
      <SongsPreloadRelease />
      <section className="screen-spread songs-spread" aria-labelledby="songs-title">
        <div className="screen-copy songs-copy">
          <p className="screen-kicker">{content.kicker}</p>
          <h1 id="songs-title" className="screen-title">
            {content.title}
          </h1>
        </div>

        <ol className="spotify-embed-list" aria-label={content.list_label}>
          {content.tracks.map((track, index) => (
            <li className="spotify-embed-card" key={track.src}>
              <span className="song-number">{String(index + 1).padStart(2, '0')}</span>
              <iframe
                data-testid="embed-iframe"
                className="spotify-frame"
                title={`${content.embed_title_prefix}: ${track.title}`}
                src={track.src}
                width="100%"
                height="152"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="eager"
              />
            </li>
          ))}
        </ol>
      </section>
    </FullscreenShell>
  );
}
