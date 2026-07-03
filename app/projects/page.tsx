import type { Metadata } from 'next';
import { getAllProjects, getProjectsPageContent } from '@/lib/content';
import FullscreenShell from '../components/FullscreenShell';

export function generateMetadata(): Metadata {
  const content = getProjectsPageContent();
  return {
    title: content.meta_title,
    description: content.meta_description,
  };
}

export default function ProjectsPage() {
  const content = getProjectsPageContent();
  const projects = getAllProjects();

  return (
    <FullscreenShell className="projects-screen">
      <section className="screen-spread" aria-labelledby="projects-title">
        <div className="screen-copy projects-intro">
          {content.kicker && <p className="screen-kicker">{content.kicker}</p>}
          <h1 id="projects-title" className="screen-title">
            {content.title}
          </h1>
          {content.lede && (
            <p className="screen-lede">
              {content.lede}
            </p>
          )}
        </div>

        <div className="project-grid" aria-label={content.list_label ?? content.title}>
          {projects.map((project, index) => (
            <article className="project-tile project-ledger-row" key={project.title}>
              <div className="tile-date">
                <span className="tile-index">
                  {project.date ?? String(index + 1).padStart(2, '0')}
                </span>
                <span className="tile-status">{project.status}</span>
              </div>
              <div className="tile-body">
                {project.role && <p className="tile-role">{project.role}</p>}
                <h2>{project.title}</h2>
                {project.outcome && <p className="tile-outcome">{project.outcome}</p>}
                <p className="tile-description">{project.description}</p>
                <div className="tile-tech">
                  {project.tech.slice(0, 4).map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </div>
              </div>
              {project.link && project.link !== '#' && (
                <a className="tile-link" href={project.link} target="_blank" rel="noopener noreferrer">
                  {project.artifact_label ?? content.cta_label}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </FullscreenShell>
  );
}
