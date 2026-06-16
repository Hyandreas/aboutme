'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Overture from '../components/Overture';
import CarvedHeading from '../components/reliquary/CarvedHeading';
import MaskReveal from '../components/reliquary/MaskReveal';
import Kicker from '../components/reliquary/Kicker';
import InkNumeral from '../components/reliquary/InkNumeral';
import type { ProjectData } from '@/lib/content';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

interface RelicProps {
  project: ProjectData;
  index: number;
}

function Relic({ project, index }: RelicProps) {
  const mirrored = index % 2 === 1;
  const numeral = ROMAN[index] ?? String(index + 1);
  const hasLink = !!project.link && project.link !== '#';

  return (
    <motion.article
      className="relative py-24 md:py-40 first:pt-16"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Sticky chapter numeral — an editorial anchor */}
      <div className="pointer-events-none absolute top-24 left-0 right-0 md:sticky md:top-28 md:self-start">
        <div className="container-custom">
          <div
            className={`chapter-numeral select-none ${
              mirrored ? 'text-right' : 'text-left'
            }`}
            aria-hidden="true"
          >
            {numeral}.
          </div>
        </div>
      </div>

      <div className="container-custom">
        <div
          className={`grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-start ${
            mirrored ? 'md:[direction:rtl]' : ''
          }`}
        >
          {/* Essay column */}
          <div
            className={`md:col-span-7 ${mirrored ? 'md:col-start-6' : 'md:col-start-1'} [direction:ltr]`}
          >
            <MaskReveal delay={0.1}>
              <Kicker numeral={`${numeral}.`}>
                {project.status === 'current'
                  ? 'In progress'
                  : project.status === 'future'
                    ? 'Planned'
                    : 'Completed'}
              </Kicker>
            </MaskReveal>

            <CarvedHeading
              as="h2"
              className="mt-6 text-3xl md:text-[2.6rem] leading-[1.08] tracking-[0.02em]"
              delay={0.2}
              aberrate={false}
              mode="mask"
            >
              {project.title}
            </CarvedHeading>

            <motion.p
              className="mt-8 text-lg leading-[1.75] text-bone/80"
              style={{ fontFamily: 'Crimson Text, serif', maxWidth: '62ch' }}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {project.description}
            </motion.p>

            {/* Tech list — no chips, no boxes. Just inscription. */}
            {project.tech.length > 0 && (
              <motion.div
                className="mt-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.9, delay: 0.7 }}
              >
                <div
                  className="text-ash"
                  style={{
                    fontFamily: 'Special Elite, monospace',
                    fontSize: '0.78rem',
                    letterSpacing: '0.14em',
                  }}
                >
                  {project.tech.map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && (
                        <span className="mx-2 text-bone/20" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <span>{t}</span>
                    </React.Fragment>
                  ))}
                </div>
              </motion.div>
            )}

            {/* The single correspondence link */}
            {hasLink ? (
              <motion.div
                className="mt-10"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.9, delay: 0.9 }}
              >
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-reliquary"
                  aria-label={`Open project: ${project.title}`}
                >
                  <span className="cta-arrow" aria-hidden="true">↳</span>
                  <span>View project</span>
                </a>
              </motion.div>
            ) : (
              <motion.div
                className="mt-10 text-ash/70 italic"
                style={{ fontFamily: 'Crimson Text, serif', fontSize: '0.95rem' }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.9, delay: 0.9 }}
              >
                — write-up coming soon.
              </motion.div>
            )}
          </div>

          {/* Vitrine panel — a quiet frame with the project's essence */}
          <div
            className={`md:col-span-4 ${mirrored ? 'md:col-start-2' : 'md:col-start-9'} [direction:ltr]`}
          >
            <MaskReveal delay={0.3}>
              <VitrinePanel project={project} numeral={numeral} />
            </MaskReveal>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function VitrinePanel({
  project,
  numeral,
}: {
  project: ProjectData;
  numeral: string;
}) {
  const reduceMotion = useReducedMotion();
  const statusLabel =
    project.status === 'current'
      ? 'In progress'
      : project.status === 'future'
        ? 'Planned'
        : 'Completed';

  return (
    <motion.div
      className="vitrine rim-top p-8 md:p-10 aspect-[3/4] flex flex-col justify-between relative"
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Top inscription */}
      <div className="flex items-center justify-between kicker text-bone/50">
        <span>Project</span>
        <span>{numeral}</span>
      </div>

      {/* InkNumeral — pathLength draw-in + ink-bleed blob */}
      <div className="relative flex-1 flex items-center justify-center my-6 aspect-square">
        <InkNumeral numeral={numeral} />
      </div>

      {/* Bottom ledger */}
      <div className="space-y-3 text-[0.7rem] kicker">
        <div className="flex items-center justify-between">
          <span className="text-bone/40">Status</span>
          <span className="text-bone/80">{statusLabel}</span>
        </div>
        <div className="h-px bg-bone/10" />
        <div className="flex items-center justify-between">
          <span className="text-bone/40">Stack</span>
          <span className="text-bone/80 truncate max-w-[60%] text-right normal-case tracking-normal">
            {project.tech[0] ?? '—'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

interface ProjectsClientProps {
  current: ProjectData[];
  past: ProjectData[];
  future: ProjectData[];
}

export default function ProjectsClient({ current, past, future }: ProjectsClientProps) {
  // Flatten into a single ordered sequence: current → past → future.
  const ordered = [...current, ...past, ...future];

  return (
    <>
      <Overture spec="Andreas Tsang — Projects" />
      <Navigation />
      <main className="relative min-h-screen">
        {/* Opening */}
        <section className="relative pt-40 md:pt-52 pb-12">
          <div className="container-custom">
            <MaskReveal>
              <Kicker>Selected work</Kicker>
            </MaskReveal>

            <CarvedHeading
              as="h1"
              className="mt-8 text-[14vw] md:text-[8vw] lg:text-[7vw] leading-[0.95]"
              delay={0.15}
            >
              Projects
            </CarvedHeading>

            <motion.p
              className="mt-10 text-lg md:text-xl italic text-ash max-w-[58ch] leading-[1.7]"
              style={{ fontFamily: 'Crimson Text, serif' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              A few things I&rsquo;ve built and studied &mdash; across research, simulation, and
              software. Some are finished; some are still in progress.
            </motion.p>
          </div>
        </section>

        {/* Relic sequence */}
        {ordered.length > 0 ? (
          <div>
            {ordered.map((project, i) => (
              <Relic key={`${project.title}-${i}`} project={project} index={i} />
            ))}
          </div>
        ) : (
          <div className="container-custom py-24 text-center">
            <p
              className="italic text-ash"
              style={{ fontFamily: 'Crimson Text, serif' }}
            >
              Projects are being added.
            </p>
          </div>
        )}

        {/* Closing inscription */}
        <section className="relative py-32 md:py-48">
          <div className="container-custom text-center">
            <div className="inline-block">
              <div
                className="h-px w-24 mx-auto mb-10"
                style={{
                  background:
                    'linear-gradient(to right, transparent, rgba(232,228,216,0.4), transparent)',
                }}
              />
              <p
                className="kicker text-bone/50"
                style={{ letterSpacing: '0.45em' }}
              >
                More soon
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
