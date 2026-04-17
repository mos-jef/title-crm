import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Parcel } from '../database';
import ParcelRecovery from './ParcelRecovery';

const OLD_PREFIX = 'C:\\Users\\AndersonFam\\OneDrive\\Documents\\TitleCRM\\Parcels';
const NEW_PREFIX = 'W:\\TitleCRM\\Parcels';

interface UserSummary {
  uid: string;
  displayName: string;
  email: string;
  parcels: Parcel[];
}

export default function AdminView() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // First try listing the users collection
        const usersSnap = await getDocs(collection(db, 'users'));
        let userIds: { uid: string; displayName: string; email: string }[] = [];

        if (usersSnap.size > 0) {
          // Users collection has documents — use them
          for (const userDoc of usersSnap.docs) {
            const uid = userDoc.id;
            const profileSnap = await getDocs(collection(db, 'users', uid, 'profile'));
            let displayName = uid;
            let email = '';
            profileSnap.forEach(d => {
              displayName = d.data().displayName || uid;
              email = d.data().email || '';
            });
            userIds.push({ uid, displayName, email });
          }
        } else {
          // No top-level user docs — fall back to current logged-in user
          const currentUser = auth.currentUser;
          if (currentUser) {
            const profileSnap = await getDocs(collection(db, 'users', currentUser.uid, 'profile'));
            let displayName = currentUser.displayName || currentUser.uid;
            let email = currentUser.email || '';
            profileSnap.forEach(d => {
              displayName = d.data().displayName || displayName;
              email = d.data().email || email;
            });
            userIds.push({ uid: currentUser.uid, displayName, email });

            // Also create the top-level user doc so this works next time
            try {
              await setDoc(doc(db, 'users', currentUser.uid), {
                email,
                displayName,
                createdAt: new Date().toISOString(),
              }, { merge: true });
            } catch (e) {
              console.warn('Could not create top-level user doc:', e);
            }
          }
        }

        const results: UserSummary[] = [];
        for (const u of userIds) {
          const parcelsSnap = await getDocs(collection(db, 'users', u.uid, 'parcels'));
          const parcels: Parcel[] = [];
          parcelsSnap.forEach(d => parcels.push(d.data() as Parcel));
          results.push({ ...u, parcels });
        }

        setUsers(results);
      } catch (err) {
        console.error('Admin load error:', err);
        // Last resort fallback — use current user
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const parcelsSnap = await getDocs(collection(db, 'users', currentUser.uid, 'parcels'));
            const parcels: Parcel[] = [];
            parcelsSnap.forEach(d => parcels.push(d.data() as Parcel));
            setUsers([{
              uid: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email || currentUser.uid,
              email: currentUser.email || '',
              parcels,
            }]);
          } catch (e) {
            console.error('Fallback load also failed:', e);
          }
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleMigratePaths() {
    if (!window.confirm(
      `This will update all parcel folderPaths from:\n\n` +
      `${OLD_PREFIX}\n\nto:\n\n${NEW_PREFIX}\n\nProceed?`
    )) return;

    setMigrating(true);
    setMigrateResult(null);
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    try {
      for (const user of users) {
        const parcelsSnap = await getDocs(
          collection(db, 'users', user.uid, 'parcels')
        );

        for (const parcelDoc of parcelsSnap.docs) {
          const data = parcelDoc.data();
          const oldPath: string = data.folderPath || '';

          if (oldPath.startsWith(OLD_PREFIX)) {
            const newPath = oldPath.replace(OLD_PREFIX, NEW_PREFIX);
            try {
              await updateDoc(
                doc(db, 'users', user.uid, 'parcels', parcelDoc.id),
                { folderPath: newPath, updatedAt: new Date().toISOString() }
              );
              updated++;
            } catch (err) {
              console.error(`Failed to update ${parcelDoc.id}:`, err);
              errors++;
            }
          } else {
            skipped++;
          }
        }
      }

      setMigrateResult(
        `Done! Updated: ${updated}, Already correct: ${skipped}, Errors: ${errors}`
      );

      // Reload users to show updated data
      const reloadedUsers: UserSummary[] = [];
      for (const u of users) {
        const parcelsSnap = await getDocs(collection(db, 'users', u.uid, 'parcels'));
        const parcels: Parcel[] = [];
        parcelsSnap.forEach(d => parcels.push(d.data() as Parcel));
        reloadedUsers.push({ ...u, parcels });
      }
      setUsers(reloadedUsers);

    } catch (err: any) {
      setMigrateResult(`Migration failed: ${err.message}`);
    }

    setMigrating(false);
  }

  if (loading) return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
          Admin — All Accounts
        </h2>
        <button className="btn-primary" onClick={() => setShowRecovery(true)}
          style={{ fontSize: 13, padding: '8px 14px' }}>
          🔄 Run Parcel Recovery
        </button>
      </div>
      <div style={{ color: 'var(--text-muted)' }}>Loading accounts...</div>
      {showRecovery && <ParcelRecovery onClose={() => setShowRecovery(false)} />}
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
          Admin — All Accounts
        </h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-primary"
            onClick={handleMigratePaths}
            disabled={migrating}
            style={{
              fontSize: 13,
              padding: '8px 14px',
              background: '#f59e0b',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: migrating ? 'not-allowed' : 'pointer',
              opacity: migrating ? 0.6 : 1,
            }}
          >
            {migrating ? '⏳ Migrating...' : '📁 Migrate Folder Paths to W:'}
          </button>
          <button className="btn-primary" onClick={() => setShowRecovery(true)}
            style={{ fontSize: 13, padding: '8px 14px' }}>
            🔄 Run Parcel Recovery
          </button>
        </div>
      </div>

      {migrateResult && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 16,
          borderRadius: 8,
          background: migrateResult.startsWith('Done') ? '#065f4620' : '#7f1d1d20',
          color: migrateResult.startsWith('Done') ? '#86efac' : '#fca5a5',
          fontSize: 13,
          fontWeight: 500,
        }}>
          {migrateResult}
        </div>
      )}

      {showRecovery && <ParcelRecovery onClose={() => setShowRecovery(false)} />}

      {users.length === 0 && (
        <div style={{ color: 'var(--text-muted)' }}>No users found.</div>
      )}

      {users.map(u => (
        <div key={u.uid} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 16,
          overflow: 'hidden',
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(expanded === u.uid ? null : u.uid)}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16 }}>
                {u.displayName}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{u.email}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 13,
              }}>
                {u.parcels.length} parcel{u.parcels.length !== 1 ? 's' : ''}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>
                {expanded === u.uid ? '▲' : '▼'}
              </span>
            </div>
          </div>

          {expanded === u.uid && (
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {u.parcels.length === 0 ? (
                <div style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: 13 }}>
                  No parcels yet.
                </div>
              ) : (
                u.parcels.map(p => (
                  <div key={p.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '180px 1fr 120px 100px',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 24px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 13,
                  }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {p.apn}
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {p.assessedOwner || p.legalOwner || '—'}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {p.acres ? `${p.acres} ac` : '—'}
                    </div>
                    <span style={{
                      color: p.completed ? '#86efac' : '#fbbf24',
                      fontWeight: 600,
                    }}>
                      {p.completed ? '✓ Done' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}