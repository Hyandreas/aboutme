'use client';

import { motion } from 'framer-motion';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

interface Project {
  title: string;
  description: string;
  tech: string[];
  link: string;
}

const currentProjects: Project[] = [
];

const pastProjects: Project[] = [
  {
    title: "PeddieHacks 2025",
    description: "",
    tech: ["Completed"],
    link: "#"
  }
];

const futureProjects: Project[] = [
  {
    title: "Coming Soon...",
    description: "",
    tech: ["?"],
    link: "#"
  }
];

interface ProjectSectionProps {
  title: string;
  projects: Project[];
  delayOffset?: number;
}

const ProjectSection = ({ title, projects, delayOffset = 0 }: ProjectSectionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: delayOffset, duration: 0.8 }}
    className="mb-16"
  >
    <h2 className="text-3xl md:text-4xl font-bold text-white-accent mb-8 text-center">
      {title}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delayOffset + (index * 0.1), duration: 0.8 }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: '0 20px 40px rgba(99, 102, 241, 0.3)'
          }}
          className="bg-deep-black/80 backdrop-blur-sm rounded-lg p-6 border border-necro-purple/30 shadow-frost hover:border-ice-blue/50 transition-all duration-300"
        >
          <h3 className="text-xl font-semibold text-white-accent mb-3">
            {project.title}
          </h3>
          <p className="text-pale-blue mb-4 text-sm leading-relaxed">
            {project.description}
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {project.tech.map((tech, techIndex) => (
              <span
                key={techIndex}
                className="px-3 py-1 text-xs bg-necro-purple/20 text-ice-blue rounded-full border border-ice-blue/20"
              >
                {tech}
              </span>
            ))}
          </div>
          <motion.a
            href={project.link}
            className="inline-block text-white-accent hover:text-ice-blue transition-colors duration-300"
            whileHover={{ x: 5 }}
          >
            View Project →
          </motion.a>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

export default function ProjectsPage() {
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
                Projects
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-ice-blue via-necro-purple to-ice-blue mx-auto animate-necro-glow" />
            </motion.div>

            <ProjectSection 
              title="Current Projects" 
              projects={currentProjects} 
              delayOffset={0.2} 
            />
            
            <ProjectSection 
              title="Past Projects" 
              projects={pastProjects} 
              delayOffset={0.4} 
            />
            
            <ProjectSection 
              title="Future Projects" 
              projects={futureProjects} 
              delayOffset={0.6} 
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}