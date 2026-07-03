import type { Metadata } from 'next'
import React from 'react'
import FullscreenShell from './components/FullscreenShell'
import { getHomeContent } from '@/lib/content'

export function generateMetadata(): Metadata {
  const content = getHomeContent()
  const metadata: Metadata = {
    title: content.meta_title,
  }

  if (content.meta_description) {
    metadata.description = content.meta_description
  }

  return metadata
}

export default function Home() {
  const content = getHomeContent()

  return (
    <FullscreenShell className="home-screen">
      <section className="screen-copy home-copy" aria-labelledby="home-title">
        <p className="screen-kicker">{content.kicker}</p>
        <h1 id="home-title" className="screen-title home-title">
          {content.title}
        </h1>
        {content.intro && (
          <p className="home-intro">{content.intro}</p>
        )}
        <div className="home-lines">
          {content.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </FullscreenShell>
  )
}
