import { getAllProjects } from '@/lib/content';
import ProjectsClient from './ProjectsClient';

export default function ProjectsPage() {
  const all = getAllProjects();
  return (
    <ProjectsClient
      current={all.filter((p) => p.status === 'current')}
      past={all.filter((p) => p.status === 'past')}
      future={all.filter((p) => p.status === 'future')}
    />
  );
}
