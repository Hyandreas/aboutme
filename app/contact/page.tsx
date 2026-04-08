import { getPageContent } from '@/lib/content';
import ContactClient from './ContactClient';

interface ContactFrontmatter {
  email: string;
  discord: string;
  intro: string;
}

export default function ContactPage() {
  const { frontmatter } = getPageContent<ContactFrontmatter>('contact.md');
  return (
    <ContactClient
      email={frontmatter.email ?? ''}
      discord={frontmatter.discord ?? ''}
      intro={frontmatter.intro ?? ''}
    />
  );
}
