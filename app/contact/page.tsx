'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      alert('Thank you for your message! I will get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

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
                Contact Me
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-ice-blue via-necro-purple to-ice-blue mx-auto animate-necro-glow" />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <div className="bg-deep-black/80 backdrop-blur-sm rounded-lg p-8 border border-necro-purple/30 shadow-necro h-full">
                  <h2 className="text-2xl font-semibold text-white-accent mb-6">Get In Touch</h2>
                  <div className="space-y-4 text-pale-blue">
                    <p>
                      Always open to connecting to discuss projects/opportunities, or just to chat.
                    </p>
                    <div className="pt-6 space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-ice-blue">📧</span>
                        <span>andreastsang28@gmail.com</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-ice-blue">💬</span>
                        <span>Discord: hycipher</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <form 
                  onSubmit={handleSubmit}
                  className="bg-deep-black/80 backdrop-blur-sm rounded-lg p-8 border border-necro-purple/30 shadow-necro"
                >
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="name" className="block text-white-accent mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-winter-mist/10 border border-ice-blue/20 rounded-lg text-off-white placeholder-pale-blue/50 focus:outline-none focus:border-ice-blue/50 transition-colors"
                        placeholder="Your name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-white-accent mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-winter-mist/10 border border-ice-blue/20 rounded-lg text-off-white placeholder-pale-blue/50 focus:outline-none focus:border-ice-blue/50 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-white-accent mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        className="w-full px-4 py-3 bg-winter-mist/10 border border-ice-blue/20 rounded-lg text-off-white placeholder-pale-blue/50 focus:outline-none focus:border-ice-blue/50 transition-colors resize-none"
                        placeholder="Your message..."
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-ice-blue to-necro-purple text-white font-semibold rounded-lg hover:shadow-necro-glow transition-all duration-300 disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmitting ? 'Sending...' : 'Send Message'}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}