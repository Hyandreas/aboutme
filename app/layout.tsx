import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
import './components/coldopen/coldOpen.css'
import LockdownOverlay from './components/LockdownOverlay'
import ColdOpen from './components/coldopen/ColdOpen'
import { COLD_OPEN_SEEN_KEY } from './components/coldopen/coldOpenState'
import SpotifyEmbedPreloader from './components/SpotifyEmbedPreloader'
import { getConfig, getSiteChrome, getSongsContent } from '@/lib/content'

const coldOpenBootScript = `
(function () {
  try {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = window.sessionStorage && window.sessionStorage.getItem(${JSON.stringify(COLD_OPEN_SEEN_KEY)});
    document.documentElement.classList.add(reduce || seen ? 'intro2-skip' : 'intro2-playing');
  } catch (error) {
    document.documentElement.classList.add('intro2-playing');
  }
})();
`

export function generateMetadata(): Metadata {
  const { metadata } = getSiteChrome()
  return {
    title: metadata.title,
    description: metadata.description,
    keywords: metadata.keywords,
    authors: [{ name: metadata.author }],
    openGraph: {
      title: metadata.og_title,
      description: metadata.og_description,
      type: 'website',
    },
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { lockdown, lockdown_kicker, lockdown_title, lockdown_message } = getConfig()
  const { cold_open } = getSiteChrome()
  const spotifyEmbedUrls = getSongsContent().tracks.map((track) => track.src)

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://open.spotify.com" />
        <link rel="preconnect" href="https://embed-cdn.spotifycdn.com" />
        {/* All Google Fonts — site faces (Crimson Text / Cinzel / Special Elite)
            and the cold-open reel faces (Press Start 2P / VT323) —
            loaded via <link>, NOT @import. This project's webpack CSS pipeline
            does not keep an @import ahead of other rules, so the browser silently
            dropped it (verified: the @import landed ~170 rules deep in the
            bundle). A root-layout <link> is honored regardless of CSS order and
            applies to every route. The no-page-custom-font lint rule targets
            pages/_document misuse and is a false positive for the app router. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=Cinzel:wght@400;500;600&family=Special+Elite&family=Press+Start+2P&family=VT323&display=swap" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: coldOpenBootScript }} />
      </head>
      <body className="antialiased">
        <ColdOpen content={cold_open} />
        <SpotifyEmbedPreloader urls={spotifyEmbedUrls} />
        {children}
        {lockdown && (
          <LockdownOverlay
            kicker={lockdown_kicker}
            title={lockdown_title}
            message={lockdown_message}
          />
        )}
        <div id="scroll-top" />
      </body>
    </html>
  )
}
