import { Theme } from '../theme';

interface Props {
  onNewParcel: () => void;
  onShowList: () => void;
  onToggleTheme: () => void;
  theme: Theme;
}

export default function Sidebar({ onNewParcel, onShowList, onToggleTheme, theme }: Props) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">📋 Title CRM</div>

      <button className="sidebar-btn" onClick={onShowList}>
        🗂 All Parcels
      </button>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button className="sidebar-new-btn" onClick={onNewParcel}>
          + New Parcel
        </button>
      </div>
    </div>
  );
}
