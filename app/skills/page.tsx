'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Download } from 'lucide-react';

export default function CVPage() {
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(true);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/assets/cv.pdf';
    link.download = 'Andreas_Tsang_CV.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePdfLoad = () => {
    setPdfLoaded(true);
    setShowComingSoon(false);
  };

  useEffect(() => {
    fetch('/assets/cv.pdf')
      .then(response => {
        if (response.ok) {
          setShowComingSoon(false);
        }
      })
      .catch(() => {
        setShowComingSoon(true);
      });
  }, []);

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-necro-purple/20 via-deep-black to-ice-blue/10">
        {/* Winter mist overlay */}
        <div className="fixed inset-0 winter-mist pointer-events-none" />
        
        <section className="relative py-20 px-5">
          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-center mb-12"
            >
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-4 text-white-accent text-shadow-glow">
                Curriculum Vitae
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-ice-blue via-necro-purple to-ice-blue mx-auto animate-necro-glow" />
            </motion.div>

            {/* PDF Viewer Container */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative max-w-4xl mx-auto"
            >
              <div className="bg-deep-black/80 backdrop-blur-sm rounded-lg p-2 md:p-4 border border-necro-purple/30 shadow-necro transition-all duration-300 hover:shadow-necro-glow hover:border-necro-purple/50">
                {showComingSoon ? (
                  /* Coming Soon Message */
                  <div className="w-full h-[500px] md:h-[700px] lg:h-[800px] flex items-center justify-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className="text-center"
                    >
                      <motion.div
                        animate={{ 
                          textShadow: [
                            '0 0 10px rgba(99, 102, 241, 0.6)',
                            '0 0 20px rgba(99, 102, 241, 0.8)',
                            '0 0 10px rgba(99, 102, 241, 0.6)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="text-6xl md:text-8xl font-display font-bold text-white-accent mb-6"
                      >
                        Coming Soon
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="text-pale-blue text-lg md:text-xl mb-8"
                      >
                        ;)
                      </motion.div>
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-24 h-24 mx-auto"
                      >
                        <div className="w-full h-full rounded-full border-4 border-necro-purple/30 border-t-necro-purple animate-spin" />
                      </motion.div>
                    </motion.div>
                  </div>
                ) : (
                  <>
                    {/* PDF Embed */}
                    <div className="w-full h-[500px] md:h-[700px] lg:h-[800px] bg-white rounded cursor-pointer" onClick={handleDownload}>
                      <iframe
                        src="/assets/cv.pdf"
                        className="w-full h-full rounded"
                        title="Andreas Tsang CV"
                        onLoad={handlePdfLoad}
                      />
                    </div>
                    
                    {/* Download overlay */}
                    <div className="absolute inset-0 bg-necro-purple/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer" onClick={handleDownload}>
                      <motion.div
                        className="bg-deep-black/90 backdrop-blur-sm rounded-lg p-3 md:p-4 border border-ice-blue/50"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="flex items-center space-x-2 md:space-x-3 text-white-accent">
                          <Download size={20} className="md:w-6 md:h-6 animate-pulse" />
                          <span className="font-semibold text-sm md:text-base">Click to Download CV</span>
                        </div>
                      </motion.div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Fallback message if PDF doesn't load */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-8 text-center"
            >
              <button
                onClick={handleDownload}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-necro-purple to-ice-blue text-white px-6 py-3 rounded-lg font-semibold hover:shadow-necro-glow transition-all duration-300"
              >
                <Download size={20} />
                <span>Download CV (PDF)</span>
              </button>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}