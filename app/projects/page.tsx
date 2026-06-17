import { getAllProjects } from '@/lib/content';
import ProjectsClient from './ProjectsClient';
import ProjectsIntroRedirect from './ProjectsIntroRedirect';

export default function ProjectsPage() {
  const all = getAllProjects();
  return (
    <ProjectsIntroRedirect>
      <ProjectsClient
        current={all.filter((p) => p.status === 'current')}
        past={all.filter((p) => p.status === 'past')}
        future={all.filter((p) => p.status === 'future')}
      />
    </ProjectsIntroRedirect>
  );
}
