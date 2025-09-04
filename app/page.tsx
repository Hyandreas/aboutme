import React from 'react'
import Navigation from './components/Navigation'
import Hero from './components/Hero'
import Footer from './components/Footer'

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <Hero />
      </main>
      <Footer />
    </>
  )
}