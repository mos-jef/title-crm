export const darkTheme = {
  '--bg-primary': '#171812',
  '--bg-secondary': '#1e1f1a',
  '--bg-tertiary': '#25261f',
  '--bg-card': '#20211c',
  '--bg-input': '#161712',
  '--border': '#34352d',

  '--text-primary': '#FFCD8B',
  '--text-secondary': '#A5EDF7',
  '--text-muted': '#A18356',

  '--accent-blue': '#78dce8',
  '--accent': '#a9dc76',
  '--accent-green': '#a9dc76',
  '--accent-yellow': '#FAAA8B',
  '--accent-orange': '#fc9867',
  '--accent-red': '#ff6188',
  '--accent-purple': '#ab9df2',
  '--accent-primary': '#EBA953',

  '--btn-primary-bg': '#C4E439',
  '--btn-primary-text': '#171812',

  '--badge-pending-bg': '#332a1d',
  '--badge-pending-text': '#ffd866',
  '--badge-done-bg': '#1d2b1f',
  '--badge-done-text': '#a9dc76',
  '--icon-filter': 'brightness(0) saturate(100%) invert(77%) sepia(20%) saturate(1115%) hue-rotate(141deg) brightness(105%) contrast(102%)',
};

export const lightTheme = {
  '--bg-primary': '#f6f1e6',
  '--bg-secondary': '#efe7d8',
  '--bg-tertiary': '#e7decd',
  '--bg-card': '#fbf6ec',
  '--bg-input': '#f1eadb',
  '--border': '#d2c6b3',
  '--text-primary': '#AD1111',
  '--text-secondary': '#881E1E',
  '--text-muted': '#C019D6',
  '--accent-blue': '#2f9fbc',
  '--accent': '#7dbd2f',
  '--accent-green': '#7dbd2f',
  '--accent-yellow': '#FF985D',
  '--accent-orange': '#e67e22',
  '--accent-red': '#d94f70',
  '--accent-purple': '#8b63d9',
  '--accent-primary': '#7dbd2f',
  '--btn-primary-bg': '#15BBBB',
  '--btn-primary-text': '#fbf6ec',
  '--badge-pending-bg': '#f6e7b8',
  '--badge-pending-text': '#8a6500',
  '--badge-done-bg': '#dff0c9',
  '--badge-done-text': '#4f8618',
  '--icon-filter': 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(980%) hue-rotate(89deg) brightness(96%) contrast(93%)',
};

export const midnightTheme = {
   '--bg-primary': '#272822',
  '--bg-secondary': '#1e1f1c',
  '--bg-tertiary': '#161712',
  '--bg-card': '#2d2e27',
  '--bg-input': '#1b1c18',
  '--border': '#3a3b35',
  '--text-primary': '#B3DBEB',
  '--text-secondary': '#CBB2F3',
  '--text-muted': '#E9DEA0',
  '--accent-blue': '#66d9ef',
  '--accent': '#E2582E',
  '--accent-green': '#a6e22e',
  '--accent-yellow': '#73DD35',
  '--accent-orange': '#fd971f',
  '--accent-red': '#f92672',
  '--accent-primary': '#E2942E',
  '--btn-primary-bg': '#E2942E',
  '--btn-primary-text': '#272822',
  '--badge-pending-bg': '#3a2f1f',
  '--badge-pending-text': '#e6db74',
  '--badge-done-bg': '#1f3320',
  '--badge-done-text': '#a6e22e',
  '--icon-filter': 'brightness(0) saturate(100%) invert(83%) sepia(43%) saturate(516%) hue-rotate(42deg) brightness(98%) contrast(89%)',
};


export const forestTheme = {
  '--bg-primary': '#f3efe3',
  '--bg-secondary': '#ebe5d6',
  '--bg-tertiary': '#e2dbc9',
  '--bg-card': '#f8f3e7',
  '--bg-input': '#ede6d6',
  '--border': '#cfc5b1',

  '--text-primary': '#633D04',
  '--text-secondary': '#B13520',
  '--text-muted': '#4C5B8D',

  '--accent-blue': '#3aa8c1',
  '--accent': '#7fb414',
  '--accent-green': '#7fb414',
  '--accent-yellow': '#F39173',
  '--accent-orange': '#e67e22',
  '--accent-red': '#d14b72',
  '--accent-purple': '#8f67d9',
  '--accent-primary': '#7fb414',

  '--btn-primary-bg': '#7fb414',
  '--btn-primary-text': '#f8f3e7',

  '--badge-pending-bg': '#f1e2b8',
  '--badge-pending-text': '#7a5d00',
  '--badge-done-bg': '#dcecc8',
  '--badge-done-text': '#4f7d10',
  '--icon-filter': 'brightness(0) saturate(100%) invert(45%) sepia(95%) saturate(2842%) hue-rotate(17deg) brightness(109%) contrast(104%)',
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
  '--icon-filter': 'brightness(0) invert(0.9) sepia(0.3)',
};

export type Theme = 'dark' | 'light' | 'midnight' | 'forest' | 'sepia';

export const THEMES: { id: Theme; label: string; preview: string[] }[] = [
  { id: 'dark',     label: 'Dark',     preview: ['#2D2A2E', '#61DD3B', '#DFBA17'] },
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