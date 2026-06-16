import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
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
