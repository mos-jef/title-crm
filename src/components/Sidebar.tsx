import { useState } from 'react';
import { Theme, THEMES } from '../theme';
import { UserProfile } from '../AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Settings from './Settings';

interface Props {
  onNewParcel: () => void;
  onShowList: () => void;
  onThemeChange: (theme: Theme) => void;
  theme: Theme;
  profile: UserProfile | null;
  onAdmin?: () => void;
}

export default function Sidebar({ onNewParcel, onShowList, onThemeChange, theme, profile, onAdmin }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  async function handleSignOut() {
    await signOut(auth);
  }

  const logoSrc = theme === 'light'
    ? require('../assets/logo-light.png')
    : require('../assets/logo-dark.png');

  return (
    <>
      <div className="sidebar">
        <div style={{ marginBottom: 16, textAlign: 'center', padding: '0 8px' }}>
          <img
            src={logoSrc}
            alt="Co-Lab"
            style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain' }}
          />
        </div>

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
          <button className="sidebar-btn" onClick={() => setShowSettings(true)}
            style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
            ⚙️ Settings
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

      {showSettings && (
        <Settings
          theme={theme}
          onThemeChange={onThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}