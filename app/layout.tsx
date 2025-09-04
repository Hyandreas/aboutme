import type { Metadata } from 'next'
import React from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Andreas Tsang - Portfolio',
  description: 'Personal portfolio showcasing projects in Geochem, Physics, Drones, 3D Animation, and Violin',
  keywords: ['portfolio', 'web development', 'geochem', 'physics', 'drones', '3d animation', 'violin'],
  authors: [{ name: 'Andreas Tsang' }],
  openGraph: {
    title: 'Andreas Tsang - Portfolio',
    description: 'Personal portfolio showcasing projects in Geochem, Physics, Drones, 3D Animation, and Violin',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" href="/assets/marion.png" as="image" />
      </head>
      <body className="antialiased">
        {children}
        <div id="scroll-top" />
      </body>
    </html>
  )
}