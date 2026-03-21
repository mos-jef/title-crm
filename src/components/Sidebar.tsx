import refreshIconUrl from '../assets/refreshicon.svg';
import { useState } from 'react';
import { Theme } from '../theme';
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
  onBatchTax?: () => void;
  onBatchPropCard?: () => void;
  onRefresh?: () => void;
}

export default function Sidebar({
  onNewParcel, onShowList, onThemeChange, theme, profile, onAdmin,
  onBatchTax, onBatchPropCard, onRefresh,
}: Props) {
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
        {/* HOME link */}
        <button className="sidebar-btn" onClick={onShowList}
          style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          HOME
        </button>

        {/* New Parcel button */}
        <button className="sidebar-new-btn" onClick={onNewParcel}>
          New Parcel
        </button>

        {/* Text CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
            onClick={onNewParcel}>Add New Parcel +</span>
          {onBatchTax && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
              onClick={onBatchTax}>Batch Import Taxes</span>
          )}
          {onBatchPropCard && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
              onClick={onBatchPropCard}>Batch Import Prop Cards</span>
          )}
        </div>

        {/* Settings section */}
        <button className="sidebar-new-btn" onClick={() => setShowSettings(true)}
          style={{ marginTop: 20, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }}>
          Settings
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
            onClick={() => setShowSettings(true)}>Theme</span>
          {onAdmin && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
              onClick={onAdmin}>Admin View</span>
          )}
        </div>

        {/* Refresh icon - centered */}
        <div style={{ flex: 1 }} />

        {onRefresh && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <img src={refreshIconUrl} alt="Refresh" onClick={onRefresh}
            style={{ width: 48, height: 48, cursor: 'pointer', objectFit: 'contain', opacity: 0.7, transition: 'opacity 0.15s', filter: 'var(--icon-filter, none)' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')} />
        </div>
      )}
        <div style={{ flex: 1 }} />

        {/* Logo */}
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <img src={logoSrc} alt="Co-Lab" style={{ maxWidth: '80%', maxHeight: 50, objectFit: 'contain' }} />
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut} style={{
          background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
          border: 'none', borderRadius: 20, padding: '7px 16px',
          fontSize: 13, cursor: 'pointer', alignSelf: 'center',
        }}>
          Sign Out
        </button>
      </div>

      {showSettings && (
        <Settings theme={theme} onThemeChange={onThemeChange} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}