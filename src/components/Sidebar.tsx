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

  const bandStyle = {
    background: 'var(--btn-primary-bg)',
    color: 'var(--btn-primary-text)',
    padding: '10px 16px',
    fontSize: 18,
    fontWeight: 700 as const,
    margin: '0 -16px',
    width: 'calc(100% + 32px)',
  };

  /* Home button style - to change its color per theme, add '--home-btn-bg' and
     '--home-btn-text' to each theme in theme.ts. For example:
       '--home-btn-bg': '#4f7d10',
       '--home-btn-text': '#ffffff',
     Then swap the background/color below to:
       background: 'var(--home-btn-bg, var(--btn-primary-bg))',
       color: 'var(--home-btn-text, var(--btn-primary-text))',
     The fallback means it uses the primary button color if no custom color is set.

     To move the Home button up or down, change the marginTop value below.
     Currently set to 40px below the Admin View / Theme text links.
  */
  const homeButtonStyle = {
    background: 'var(--home-btn-bg, var(--btn-primary-bg))',
    color: 'var(--home-btn-text, var(--btn-primary-text))',
    border: 'none',
    borderRadius: 20,
    padding: '7px 16px',
    fontSize: 13,
    cursor: 'pointer' as const,
    alignSelf: 'center' as const,
    marginTop: 40,  /* <-- change this to move the Home button up/down */
  };

  return (
    <>
      <div className="sidebar">
        {/* Logo at the top - where HOME used to be */}
        <div style={{ textAlign: 'center', padding: '0 8px', marginBottom: 16 }}>
          <img src={logoSrc} alt="Co-Lab"
            style={{ maxWidth: '100%', maxHeight: 60, objectFit: 'contain', cursor: 'pointer' }}
            onClick={onShowList} />
        </div>

        {/* New Parcel - header band */}
        <div style={bandStyle}>New Parcel</div>

        {/* Text CTAs under New Parcel */}
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

        {/* Settings - header band */}
        <div style={{ ...bandStyle, marginTop: 16 }}>Settings</div>

        {/* Text CTAs under Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
            onClick={() => setShowSettings(true)}>Theme</span>
          {onAdmin && (
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 12px' }}
              onClick={onAdmin}>Admin View</span>
          )}
        </div>

        {/* Home button - 40px below the last text CTA */}
        <button onClick={onShowList} style={homeButtonStyle}>
          Home
        </button>

        {/* Spacer pushes sign out to bottom */}
        <div style={{ flex: 1 }} />

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