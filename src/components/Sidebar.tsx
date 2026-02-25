import { Theme } from '../theme';
import { UserProfile } from '../AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface Props {
  onNewParcel: () => void;
  onShowList: () => void;
  onToggleTheme: () => void;
  theme: Theme;
  profile: UserProfile | null;
  onAdmin?: () => void;
}

export default function Sidebar({ onNewParcel, onShowList, onToggleTheme, theme, profile, onAdmin }: Props) {

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <div className="sidebar">
      <div className="sidebar-logo">📋 Co-Lab</div>

      {profile && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 8,
          borderRadius: 8,
          background: 'var(--bg-tertiary)',
          fontSize: 13,
        }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>
            Signed in as
          </div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {profile.displayName}
          </div>
        </div>
      )}

      <button className="sidebar-btn" onClick={onShowList}>
        🗂 All Parcels
      </button>

      {onAdmin && (
        <button className="sidebar-btn" onClick={onAdmin}>
          🔑 Admin View
        </button>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="theme-toggle" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <button className="sidebar-new-btn" onClick={onNewParcel}>
          + New Parcel
        </button>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          ↪ Sign Out
        </button>
      </div>
    </div>
  );
}