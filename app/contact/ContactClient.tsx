'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

interface ContactClientProps {
  email: string;
  discord: string;
  intro: string;
}

export default function ContactClient({ email, discord, intro }: ContactClientProps) {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const submitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current !== null) {
        window.clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (submitMessage) setSubmitMessage('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    submitTimeoutRef.current = window.setTimeout(() => {
      setSubmitMessage(
        'Thanks for reaching out. This form is currently a portfolio placeholder, so please use the email or Discord contact details for now.'
      );
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
      submitTimeoutRef.current = null;
    }, 1000);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-b from-necro-purple/20 via-deep-black to-ice-blue/10">
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
                    <p>{intro}</p>
                    <div className="pt-6 space-y-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-ice-blue">📧</span>
                        <span>{email}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-ice-blue">💬</span>
                        <span>Discord: {discord}</span>
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
                      <label htmlFor="name" className="block text-white-accent mb-2">Name</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        maxLength={80}
                        autoComplete="name"
                        className="w-full px-4 py-3 bg-winter-mist/10 border border-ice-blue/20 rounded-lg text-off-white placeholder-pale-blue/50 focus:outline-none focus:border-ice-blue/50 transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-white-accent mb-2">Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        maxLength={254}
                        autoComplete="email"
                        className="w-full px-4 py-3 bg-winter-mist/10 border border-ice-blue/20 rounded-lg text-off-white placeholder-pale-blue/50 focus:outline-none focus:border-ice-blue/50 transition-colors"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="message" className="block text-white-accent mb-2">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        maxLength={2000}
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
                    <p
                      aria-live="polite"
                      className={`text-sm ${submitMessage ? 'text-pale-blue' : 'text-muted-white'}`}
                    >
                      {submitMessage ||
                        'Messages are not stored yet. Use the direct contact details on the left for a guaranteed reply.'}
                    </p>
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
