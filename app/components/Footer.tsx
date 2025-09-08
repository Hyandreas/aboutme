'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Github, Linkedin, Mail, Twitter } from 'lucide-react'

const Footer = () => {
  const socialLinks = [
    {
      icon: <Github size={20} />,
      href: "https://github.com/Hyandreas",
      label: "GitHub"
    },
    {
      icon: <Linkedin size={20} />,
      href: "https://www.linkedin.com/in/andreas-tsang-701287289/",
      label: "LinkedIn"
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      href: "https://instagram.com/hyandreas_",
      label: "Instagram"
    },
    {
      icon: <Mail size={20} />,
      href: "mailto:andreastsang28@gmail.com",
      label: "Email"
    }
  ]

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <footer className="relative bg-gradient-to-t from-primary-dark to-secondary-dark border-t-2 border-necro-purple py-12">
      {/* Winter mystique animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-necro-purple/5 via-transparent to-ice-blue/5 animate-pulse" />
      
      <div className="container-custom relative z-10">
        <div className="flex flex-col items-center space-y-8">
          {/* Social Links */}
          <motion.div 
            className="flex space-x-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            {socialLinks.map((link, index) => (
              <motion.a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-shadow-gray border border-necro-purple/30 rounded-full text-off-white hover:text-primary-dark hover:bg-necro-purple hover:border-necro-purple transition-all duration-300 group"
                whileHover={{ 
                  scale: 1.1,
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4), 0 0 30px rgba(219, 234, 254, 0.3)"
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="group-hover:scale-110 transition-transform duration-200">
                  {link.icon}
                </div>
              </motion.a>
            ))}
          </motion.div>
          
          {/* Copyright */}
          <motion.div 
            className="text-center text-muted-white"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="mb-2">
              © {new Date().getFullYear()} Andreas Tsang.
            </p>
            <p className="text-sm opacity-70">
<<<<<<< HEAD
              "Everything hinges on what you do today"
=======
              "Proof is the only victory"
>>>>>>> 5520d46 (update footer)
            </p>
          </motion.div>
          
          {/* Scroll to top button */}
          <motion.button
            onClick={scrollToTop}
            className="p-2 text-necro-purple hover:text-white transition-colors duration-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            viewport={{ once: true }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m18 15-6-6-6 6"/>
              </svg>
            </motion.div>
          </motion.button>
        </div>
      </div>
      
    </footer>
  )
}

export default Footer
