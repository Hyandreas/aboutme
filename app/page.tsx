import type { Metadata } from 'next'
import React from 'react'
import HyacinthClient, { type HomeContent } from './components/hyacinth/HyacinthClient'
import ColdOpen from './components/coldopen/ColdOpen'
import { getPageContent } from '@/lib/content'

export const metadata: Metadata = {
  title: 'Andreas Tsang',
  description:
    'Andreas Tsang — applied physics, aerospace, computer science, and violin. A scroll-driven 3D portrait of a hyacinth, reconstructed as a point cloud.',
}

export default function Home() {
  // Every word on the homepage is edited in content/home.md.
  const { frontmatter } = getPageContent<HomeContent>('home.md')
  return (
    <>
      <ColdOpen />
      <HyacinthClient content={frontmatter} />
    </>
  )
}
