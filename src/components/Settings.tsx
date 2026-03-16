import { Theme, THEMES, applyTheme } from '../theme';

interface Props {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onClose: () => void;
}

export default function Settings({ theme, onThemeChange, onClose }: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 36,
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: 20 }}>
            ⚙️ Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 20,
              cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Theme section */}
        <div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14,
          }}>
            Theme
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  applyTheme(t.id);
                  onThemeChange(t.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: theme === t.id
                    ? '2px solid var(--accent-primary)'
                    : '2px solid var(--border)',
                  background: theme === t.id
                    ? 'var(--bg-tertiary)'
                    : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
              >
                {/* Color preview swatches */}
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {t.preview.map((color, i) => (
                    <div key={i} style={{
                      width: 20, height: 20,
                      borderRadius: i === 0 ? '6px 0 0 6px' : i === 2 ? '0 6px 6px 0' : 0,
                      background: color,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }} />
                  ))}
                </div>
                <span style={{
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  fontWeight: theme === t.id ? 600 : 400,
                }}>
                  {t.label}
                </span>
                {theme === t.id && (
                  <span style={{
                    marginLeft: 'auto',
                    color: 'var(--accent-primary)',
                    fontSize: 16,
                  }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-secondary" onClick={onClose}
          style={{ alignSelf: 'flex-end', padding: '8px 24px' }}>
          Close
        </button>
      </div>
    </div>
  );
}