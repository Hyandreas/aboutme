import React from 'react'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Footer from './components/Footer'
import { getPageContent } from '@/lib/content'

interface HeroFrontmatter {
  name: string;
  tagline: string;
}

export default function Home() {
  const { frontmatter } = getPageContent<HeroFrontmatter>('hero.md')
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <Hero name={frontmatter.name} tagline={frontmatter.tagline} />
      </main>
      <Footer />
    </>
  )
}
