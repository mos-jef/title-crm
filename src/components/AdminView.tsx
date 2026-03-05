import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Parcel } from '../database';
import ParcelRecovery from './ParcelRecovery';

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

  useEffect(() => {
    async function load() {
      const usersSnap = await getDocs(collection(db, 'users'));
      const results: UserSummary[] = [];

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;

        const profileSnap = await getDocs(
          collection(db, 'users', uid, 'profile')
        );
        let displayName = uid;
        let email = '';
        profileSnap.forEach(d => {
          displayName = d.data().displayName || uid;
          email = d.data().email || '';
        });

        const parcelsSnap = await getDocs(
          collection(db, 'users', uid, 'parcels')
        );
        const parcels: Parcel[] = [];
        parcelsSnap.forEach(d => parcels.push(d.data() as Parcel));

        results.push({ uid, displayName, email, parcels });
      }

      setUsers(results);
      setLoading(false);
    }
    load();
  }, []);

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
        <button className="btn-primary" onClick={() => setShowRecovery(true)}
          style={{ fontSize: 13, padding: '8px 14px' }}>
          🔄 Run Parcel Recovery
        </button>
      </div>

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