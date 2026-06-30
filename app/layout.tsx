import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
import './components/coldopen/coldOpen.css'
import VoidEffects from './components/VoidEffects'
import LockdownOverlay from './components/LockdownOverlay'
import PageCurtain from './components/reliquary/PageCurtain'
import EntranceVeil from './components/reliquary/EntranceVeil'
import LivingInk from './components/reliquary/LivingInk'
import LiveGrain from './components/reliquary/LiveGrain'
import MagneticCursor from './components/reliquary/MagneticCursor'
import RouteGate from './components/RouteGate'
import { getConfig } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Andreas Tsang',
  description:
    'Andreas Tsang — student of applied physics, aerospace, computer science, and violin. Selected work in research, simulation, and software.',
  keywords: ['portfolio', 'applied physics', 'aerospace', 'computer science', 'violin', 'research'],
  authors: [{ name: 'Andreas Tsang' }],
  openGraph: {
    title: 'Andreas Tsang',
    description:
      'Student of applied physics, aerospace, computer science, and violin. Selected work in research, simulation, and software.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { lockdown, lockdown_message } = getConfig()

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
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
      </head>
      <body className="antialiased">
        {/* Ambient background — the LivingInk flow field + grain + click rifts +
            cursor. Kept everywhere except the self-contained home scene, which
            supplies its own atmosphere and needs an unlocked scroll + cursor. */}
        <RouteGate hideOn="/">
          <LivingInk />
          <LiveGrain />
          <VoidEffects />
          <MagneticCursor />
        </RouteGate>
        {/* Entrance / route curtains — also dropped on /projects, where they
            delayed first paint + locked scroll and made the page feel slow. */}
        <RouteGate hideOn={['/', '/projects']}>
          <PageCurtain />
        </RouteGate>
        {children}
        <RouteGate hideOn={['/', '/projects']}>
          <EntranceVeil />
        </RouteGate>
        {lockdown && <LockdownOverlay message={lockdown_message} />}
        <div id="scroll-top" />
      </body>
    </html>
  )
}
