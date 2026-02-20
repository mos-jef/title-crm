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

export type Theme = 'dark' | 'light';

export function applyTheme(theme: Theme) {
  const vars = theme === 'dark' ? darkTheme : lightTheme;
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('titlecrm_theme', theme);
}

export function getSavedTheme(): Theme {
  return (localStorage.getItem('titlecrm_theme') as Theme) || 'dark';
}