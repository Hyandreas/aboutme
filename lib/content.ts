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
  date?: string;
  role?: string;
  outcome?: string;
  artifact_label?: string;
}

export interface NavigationItem {
  href: string;
  label: string;
}

export interface SiteMetadataContent {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  og_title: string;
  og_description: string;
}

export interface SiteNavigationContent {
  brand: string;
  items: NavigationItem[];
  mobile_open_label: string;
  mobile_close_label: string;
}

export interface ColdOpenContent {
  no_signal: string;
  bars_corner: string;
  timecode: string;
  presents: string;
  loading: string;
  start_label: string;
  sound_toggle_label: string;
  sound_label: string;
  sound_muted_label: string;
  post_intro_track_label: string;
  post_intro_track_title: string;
  post_intro_track_src: string;
  post_intro_track_play_label: string;
  post_intro_track_pause_label: string;
}

export interface HyacinthContent {
  bloom_button_label: string;
}

export interface SiteChromeContent {
  metadata: SiteMetadataContent;
  navigation: SiteNavigationContent;
  cold_open: ColdOpenContent;
  hyacinth: HyacinthContent;
}

export interface HomePageContent {
  meta_title: string;
  meta_description?: string;
  kicker: string;
  title: string;
  intro?: string;
  lines: string[];
}

export interface ProjectsPageContent {
  meta_title: string;
  meta_description: string;
  kicker?: string;
  title: string;
  lede?: string;
  list_label?: string;
  cta_label: string;
}

export interface InterestData {
  title: string;
  note: string;
}

export interface AboutPageContent {
  meta_title: string;
  meta_description: string;
  kicker: string;
  title: string;
  lede: string;
  meta_label: string;
  interests_label: string;
  now_label: string;
  now: string[];
  meta: string[];
  interests: InterestData[];
}

export interface SpotifyTrackData {
  title: string;
  src: string;
}

export interface SongsPageContent {
  meta_title: string;
  meta_description: string;
  kicker: string;
  title: string;
  list_label: string;
  embed_title_prefix: string;
  tracks: SpotifyTrackData[];
}

export interface DisabledPageConfig {
  path: string;
  kicker?: string;
  title?: string;
  message?: string;
}

export interface LockdownContent {
  kicker: string;
  title: string;
  message: string;
  home_label: string;
  path?: string;
}

export interface ResolvedDisabledPageConfig extends LockdownContent {
  path: string;
}

export interface SiteConfig {
  lockdown: boolean;
  lockdown_kicker: string;
  lockdown_title: string;
  lockdown_message: string;
  lockdown_home_label: string;
  disabled_pages: ResolvedDisabledPageConfig[];
}

type RawDisabledPageConfig = string | Partial<DisabledPageConfig>;

interface SiteConfigFrontmatter {
  lockdown?: boolean;
  lockdown_kicker?: string;
  lockdown_title?: string;
  lockdown_message?: string;
  lockdown_home_label?: string;
  disabled_pages?: RawDisabledPageConfig[];
}

const defaultSiteChrome: SiteChromeContent = {
  metadata: {
    title: 'Andreas Tsang',
    description:
      'Andreas Tsang - student of applied physics, aerospace, computer science, and violin. Selected work in research, simulation, and software.',
    keywords: ['portfolio', 'applied physics', 'aerospace', 'computer science', 'violin', 'research'],
    author: 'Andreas Tsang',
    og_title: 'Andreas Tsang',
    og_description:
      'Student of applied physics, aerospace, computer science, and violin. Selected work in research, simulation, and software.',
  },
  navigation: {
    brand: 'Andreas Tsang',
    items: [
      { href: '/', label: 'Home' },
      { href: '/projects', label: 'Projects' },
      { href: '/about', label: 'About' },
      { href: '/songs', label: 'Songs' },
    ],
    mobile_open_label: 'Open navigation menu',
    mobile_close_label: 'Close navigation menu',
  },
  cold_open: {
    no_signal: 'NO SIGNAL - CH-01',
    bars_corner: 'TV AV',
    timecode: '00:00:01:14',
    presents: 'ANDREAS TSANG PRESENTS',
    loading: 'LOADING',
    start_label: 'PRESS PLAY',
    sound_toggle_label: 'Toggle sound',
    sound_label: 'Sound',
    sound_muted_label: 'Muted',
    post_intro_track_label: 'Now playing',
    post_intro_track_title: 'Sweet Disposition (John Summit & Silver Panda Remix)',
    post_intro_track_src:
      '/assets/The%20Temper%20Trap%20-%20Sweet%20Disposition%20%28John%20Summit%20%26%20Silver%20Panda%20Remix%29.mp3',
    post_intro_track_play_label: 'Play soundtrack',
    post_intro_track_pause_label: 'Pause soundtrack',
  },
  hyacinth: {
    bloom_button_label: 'Bloom the hyacinth',
  },
};

const defaultHomeContent: HomePageContent = {
  meta_title: 'Andreas Tsang',
  kicker: 'Portfolio / 2026',
  title: 'Andreas Tsang',
  intro: 'Applied physics, code, and music.',
  lines: [
    'Projects, about, and favorite songs live here.',
    'More soon.',
  ],
};

const defaultProjectsPageContent: ProjectsPageContent = {
  meta_title: 'Projects | Andreas Tsang',
  meta_description: 'Selected projects by Andreas Tsang.',
  title: 'Projects',
  cta_label: 'View project',
};

const defaultAboutContent: AboutPageContent = {
  meta_title: 'About | Andreas Tsang',
  meta_description: 'A compact sketch of Andreas Tsang.',
  kicker: 'About',
  title: 'About',
  lede:
    'A compact sketch for now: physics, flight, software, and violin, all circling the same habit of figuring out how things work.',
  meta_label: 'Fields',
  interests_label: 'Interests',
  now_label: 'Now',
  now: [],
  meta: ['Applied Physics', 'Aerospace', 'Computer Science'],
  interests: [
    { title: 'Applied Physics', note: 'how things work' },
    { title: 'Robotics & Aerospace', note: 'things that fly' },
    { title: 'Computer Science', note: 'software & algorithms' },
    { title: '3D Animation', note: 'Blender' },
    { title: 'Violin', note: 'first instrument' },
    { title: 'Rowing', note: 'on the water' },
  ],
};

const defaultSongsContent: SongsPageContent = {
  meta_title: 'Favorite Songs | Andreas Tsang',
  meta_description: "Favorite songs on Andreas Tsang's portfolio.",
  kicker: 'Listening',
  title: 'Favorite Songs',
  list_label: 'Favorite songs on Spotify',
  embed_title_prefix: 'Spotify embed',
  tracks: [
    {
      title: 'Spotify track 1',
      src: 'https://open.spotify.com/embed/track/4lriIG2vNqwDWzOj2I9rtj?utm_source=generator',
    },
    {
      title: 'Spotify track 2',
      src: 'https://open.spotify.com/embed/track/7LuPjGUfJqxuW14W4gMrU2?utm_source=generator',
    },
    {
      title: 'Spotify track 3',
      src: 'https://open.spotify.com/embed/track/5ruzrDWcT0vuJIOMW7gMnW?utm_source=generator',
    },
    {
      title: 'Spotify track 4',
      src: 'https://open.spotify.com/embed/track/1HVYQj4liQb1QOygBfjZqV?utm_source=generator',
    },
  ],
};

function mergePage<T>(defaults: T, value: Partial<T>): T {
  return { ...defaults, ...value };
}

export function getSiteChrome(): SiteChromeContent {
  const { frontmatter } = getPageContent<Partial<SiteChromeContent>>('site.md');
  return {
    metadata: {
      ...defaultSiteChrome.metadata,
      ...(frontmatter.metadata ?? {}),
    },
    navigation: {
      ...defaultSiteChrome.navigation,
      ...(frontmatter.navigation ?? {}),
      items: frontmatter.navigation?.items ?? defaultSiteChrome.navigation.items,
    },
    cold_open: {
      ...defaultSiteChrome.cold_open,
      ...(frontmatter.cold_open ?? {}),
    },
    hyacinth: {
      ...defaultSiteChrome.hyacinth,
      ...(frontmatter.hyacinth ?? {}),
    },
  };
}

export function getHomeContent(): HomePageContent {
  const { frontmatter } = getPageContent<Partial<HomePageContent>>('home.md');
  return mergePage(defaultHomeContent, frontmatter);
}

export function getProjectsPageContent(): ProjectsPageContent {
  const { frontmatter } = getPageContent<Partial<ProjectsPageContent>>('projects.md');
  return mergePage(defaultProjectsPageContent, frontmatter);
}

export function getAboutContent(): AboutPageContent {
  const { frontmatter } = getPageContent<Partial<AboutPageContent>>('about.md');
  return mergePage(defaultAboutContent, frontmatter);
}

export function getSongsContent(): SongsPageContent {
  const { frontmatter } = getPageContent<Partial<SongsPageContent>>('songs.md');
  return mergePage(defaultSongsContent, frontmatter);
}

export function getConfig(): SiteConfig {
  const { frontmatter } = getPageContent<SiteConfigFrontmatter>('config.md');
  const fallback = {
    kicker: frontmatter.lockdown_kicker ?? 'Notice',
    title: frontmatter.lockdown_title ?? 'Under Construction',
    message: frontmatter.lockdown_message ?? 'This site is currently under construction.',
    home_label: frontmatter.lockdown_home_label ?? 'Return home',
  };
  const disabledPages: ResolvedDisabledPageConfig[] = (frontmatter.disabled_pages ?? [])
    .map((entry) => {
      if (typeof entry === 'string') return { path: entry, ...fallback };
      return entry.path ? entry : null;
    })
    .filter((entry): entry is DisabledPageConfig => Boolean(entry?.path))
    .map((entry): ResolvedDisabledPageConfig => {
      const withSlash = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
      return {
        ...entry,
        path: withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash,
        kicker: entry.kicker ?? fallback.kicker,
        title: entry.title ?? fallback.title,
        message: entry.message ?? fallback.message,
        home_label: fallback.home_label,
      };
    });

  return {
    lockdown: frontmatter.lockdown ?? false,
    lockdown_kicker: fallback.kicker,
    lockdown_title: fallback.title,
    lockdown_message: fallback.message,
    lockdown_home_label: fallback.home_label,
    disabled_pages: disabledPages,
  };
}

function normalizeRoutePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  const withSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

export function getDisabledPage(pathname: string): LockdownContent | null {
  const { disabled_pages } = getConfig();
  const target = normalizeRoutePath(pathname);
  const disabledPage = disabled_pages.find((page) => normalizeRoutePath(page.path) === target);

  if (!disabledPage) return null;

  return {
    kicker: disabledPage.kicker,
    title: disabledPage.title,
    message: disabledPage.message,
    home_label: disabledPage.home_label,
    path: disabledPage.path,
  };
}

export function getDisabledPageMetadata(pathname: string): { title: string; description: string } | null {
  const disabledPage = getDisabledPage(pathname);
  if (!disabledPage) return null;

  const { metadata } = getSiteChrome();
  return {
    title: `${disabledPage.title} | ${metadata.title}`,
    description: disabledPage.message,
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
      date?: string;
      role?: string;
      outcome?: string;
      artifact_label?: string;
    }>(`projects/${filename}`);
    return {
      title: frontmatter.title ?? '',
      description: body,
      tech: frontmatter.tech ?? [],
      link: frontmatter.link,
      status: frontmatter.status ?? 'past',
      date: frontmatter.date,
      role: frontmatter.role,
      outcome: frontmatter.outcome,
      artifact_label: frontmatter.artifact_label,
    };
  });
}
