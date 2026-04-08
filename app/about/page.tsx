import { getPageContent } from '@/lib/content';
import AboutClient from './AboutClient';

interface AboutFrontmatter {
  academic_focus: string[];
  other_interests: string[];
}

export default function AboutPage() {
  const { frontmatter, body } = getPageContent<AboutFrontmatter>('about.md');
  return (
    <AboutClient
      bio={body}
      academicFocus={frontmatter.academic_focus ?? []}
      otherInterests={frontmatter.other_interests ?? []}
    />
  );
}
