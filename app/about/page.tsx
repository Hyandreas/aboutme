'use client';

import { motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-necro-purple/20 via-deep-black to-ice-blue/10">
        {/* Winter mist overlay */}
        <div className="fixed inset-0 winter-mist pointer-events-none" />
        
        <section className="relative py-20 px-5">
          <div className="container mx-auto max-w-4xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center mb-12"
            >
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white-accent text-shadow-glow">
                About Me
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-ice-blue via-necro-purple to-ice-blue mx-auto animate-necro-glow" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1 }}
              className="bg-deep-black/80 backdrop-blur-sm rounded-lg p-8 md:p-12 border border-necro-purple/30 shadow-necro"
            >
              <div className="space-y-6 text-off-white/90">
                <p className="text-lg leading-relaxed text-center">
                  Coming Soon.. ;)
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                  <motion.div 
                    className="bg-necro-purple/10 p-6 rounded-lg border border-ice-blue/20"
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(74, 111, 165, 0.3)' }}
                  >
                    <h3 className="text-xl font-semibold text-white-accent mb-3">Academic Focus</h3>
                    <ul className="space-y-2 text-pale-blue">
                      <li>• Geochemistry & Gemology</li>
                      <li>• Applied Physics</li>
                      <li>• Robotics (Drones, Aerospace)</li>
                      <li>• Fullstack Development</li>
                    </ul>
                  </motion.div>
                  
                  <motion.div 
                    className="bg-necro-purple/10 p-6 rounded-lg border border-ice-blue/20"
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' }}
                  >
                    <h3 className="text-xl font-semibold text-white-accent mb-3">Other Interests</h3>
                    <ul className="space-y-2 text-pale-blue">
                      <li>• 3D Animation</li>
                      <li>• Classical Violin Performance</li>
                      <li>• Horror Novels/Films</li>
                      <li>• Rowing</li>
                    </ul>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}