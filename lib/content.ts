import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDir = path.join(process.cwd(), 'content');

export function getPageContent<T = Record<string, unknown>>(
  filePath: string
): { frontmatter: T; body: string } {
  const fullPath = path.join(contentDir, filePath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(raw);
  return { frontmatter: data as T, body: content.trim() };
}

export interface ProjectData {
  title: string;
  description: string;
  tech: string[];
  link?: string;
  status: 'current' | 'past' | 'future';
}

export interface SiteConfig {
  lockdown: boolean;
  lockdown_message: string;
}

export function getConfig(): SiteConfig {
  const { frontmatter } = getPageContent<Partial<SiteConfig>>('config.md');
  return {
    lockdown: frontmatter.lockdown ?? false,
    lockdown_message: frontmatter.lockdown_message ?? 'This site is currently under construction.',
  };
}

export function getAllProjects(): ProjectData[] {
  const projectsDir = path.join(contentDir, 'projects');
  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.md'));
  return files.map((filename) => {
    const { frontmatter, body } = getPageContent<{
      title: string;
      status: 'current' | 'past' | 'future';
      tech: string[];
      link?: string;
    }>(`projects/${filename}`);
    return {
      title: frontmatter.title ?? '',
      description: body,
      tech: frontmatter.tech ?? [],
      link: frontmatter.link,
      status: frontmatter.status ?? 'past',
    };
  });
}
