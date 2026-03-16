export const darkTheme = {
  '--bg-primary': '#2D2A2E',
  '--bg-secondary': '#221F22',
  '--bg-tertiary': '#1a1819',
  '--bg-card': '#2D2A2E',
  '--bg-input': '#1a1819',
  '--border': '#403d3f',
  '--text-primary': '#FCFCFA',
  '--text-secondary': '#939293',
  '--text-muted': '#5b595c',
  '--accent-blue': '#78DCE8',
  '--accent': '#E4704D',
  '--accent-green': '#A9DC76',
  '--accent-yellow': '#FFD866',
  '--accent-orange': '#FC9867',
  '--accent-red': '#FF6188',
  '--accent-primary': '#D15914',
  '--btn-primary-bg': '#DD4E3B',
  '--btn-primary-text': '#2D2A2E',
  '--badge-pending-bg': '#3d2a00',
  '--badge-pending-text': '#FFD866',
  '--badge-done-bg': '#1a3d1a',
  '--badge-done-text': '#A9DC76',
};

export const lightTheme = {
  '--bg-primary': '#fafafa',
  '--bg-secondary': '#f0eff0',
  '--bg-tertiary': '#e8e7e8',
  '--bg-card': '#ffffff',
  '--bg-input': '#f5f4f5',
  '--border': '#d4d2d4',
  '--text-primary': '#2D2A2E',
  '--text-secondary': '#6b696c',
  '--text-muted': '#a09fa0',
  '--accent-blue': '#0090A8',
  '--accent-purple': '#6F51E8',
  '--accent-green': '#5E8C2A',
  '--accent-yellow': '#B8860B',
  '--accent-orange': '#C4621A',
  '--accent-red': '#C4154A',
  '--accent-primary': '#6F51E8',
  '--btn-primary-bg': '#6F51E8',
  '--btn-primary-text': '#ffffff',
  '--badge-pending-bg': '#fef3c7',
  '--badge-pending-text': '#92400e',
  '--badge-done-bg': '#d1fae5',
  '--badge-done-text': '#065f46',
};

export const midnightTheme = {
  '--bg-primary': '#0f1117',
  '--bg-secondary': '#090c12',
  '--bg-tertiary': '#060809',
  '--bg-card': '#141720',
  '--bg-input': '#0a0c12',
  '--border': '#1e2433',
  '--text-primary': '#e2e8f0',
  '--text-secondary': '#94a3b8',
  '--text-muted': '#475569',
  '--accent-blue': '#38bdf8',
  '--accent': '#818cf8',
  '--accent-green': '#34d399',
  '--accent-yellow': '#fbbf24',
  '--accent-orange': '#fb923c',
  '--accent-red': '#f87171',
  '--accent-primary': '#818cf8',
  '--btn-primary-bg': '#6366f1',
  '--btn-primary-text': '#ffffff',
  '--badge-pending-bg': '#1e1a05',
  '--badge-pending-text': '#fbbf24',
  '--badge-done-bg': '#052015',
  '--badge-done-text': '#34d399',
};

export const forestTheme = {
  '--bg-primary': '#1a2318',
  '--bg-secondary': '#131a11',
  '--bg-tertiary': '#0e130d',
  '--bg-card': '#1e2a1c',
  '--bg-input': '#111810',
  '--border': '#2d3d2a',
  '--text-primary': '#e8f0e4',
  '--text-secondary': '#8fa885',
  '--text-muted': '#4a5e45',
  '--accent-blue': '#5bc4bf',
  '--accent': '#a3c97a',
  '--accent-green': '#7ec850',
  '--accent-yellow': '#d4b85a',
  '--accent-orange': '#d4845a',
  '--accent-red': '#c45a5a',
  '--accent-primary': '#7ec850',
  '--btn-primary-bg': '#5a9e35',
  '--btn-primary-text': '#0e130d',
  '--badge-pending-bg': '#2a2010',
  '--badge-pending-text': '#d4b85a',
  '--badge-done-bg': '#102010',
  '--badge-done-text': '#7ec850',
};

export const sepiaTheme = {
  '--bg-primary': '#2c2416',
  '--bg-secondary': '#231c10',
  '--bg-tertiary': '#1a150b',
  '--bg-card': '#30271a',
  '--bg-input': '#1e1810',
  '--border': '#4a3d28',
  '--text-primary': '#f5e6c8',
  '--text-secondary': '#b8a07a',
  '--text-muted': '#7a6545',
  '--accent-blue': '#8abccc',
  '--accent': '#d4954a',
  '--accent-green': '#8aaa5a',
  '--accent-yellow': '#d4b45a',
  '--accent-orange': '#d4804a',
  '--accent-red': '#c45a4a',
  '--accent-primary': '#d4954a',
  '--btn-primary-bg': '#b87830',
  '--btn-primary-text': '#1a150b',
  '--badge-pending-bg': '#2a1e08',
  '--badge-pending-text': '#d4b45a',
  '--badge-done-bg': '#141e08',
  '--badge-done-text': '#8aaa5a',
};

export type Theme = 'dark' | 'light' | 'midnight' | 'forest' | 'sepia';

export const THEMES: { id: Theme; label: string; preview: string[] }[] = [
  { id: 'dark',     label: 'Dark',     preview: ['#2D2A2E', '#DD4E3B', '#FCFCFA'] },
  { id: 'light',    label: 'Light',    preview: ['#fafafa', '#6F51E8', '#2D2A2E'] },
  { id: 'midnight', label: 'Midnight', preview: ['#0f1117', '#6366f1', '#e2e8f0'] },
  { id: 'forest',   label: 'Forest',   preview: ['#1a2318', '#5a9e35', '#e8f0e4'] },
  { id: 'sepia',    label: 'Sepia',    preview: ['#2c2416', '#b87830', '#f5e6c8'] },
];

const themeMap = {
  dark: darkTheme,
  light: lightTheme,
  midnight: midnightTheme,
  forest: forestTheme,
  sepia: sepiaTheme,
};

export function applyTheme(theme: Theme) {
  const vars = themeMap[theme];
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('titlecrm_theme', theme);
}

export function getSavedTheme(): Theme {
  return (localStorage.getItem('titlecrm_theme') as Theme) || 'dark';
}