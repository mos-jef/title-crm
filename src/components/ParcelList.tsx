import React, { useEffect, useState } from 'react';
import { Parcel, getAllParcels, toggleComplete, loadParcelsFromFirestore } from '../database';
import BatchPropertyCardImporter from './BatchPropertyCardImporter';
import BatchTaxImporter from './BatchTaxImporter';
import { useAuth } from '../AuthContext';

interface Props {
  onSelectParcel: (parcel: Parcel) => void;
  showBatchTax?: boolean;
  showBatchProp?: boolean;
  onCloseBatchTax?: () => void;
  onCloseBatchProp?: () => void;
}

export default function ParcelList({ onSelectParcel, showBatchTax, showBatchProp, onCloseBatchTax, onCloseBatchProp }: Props) {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  let avatarSrc: string | undefined;
  try { avatarSrc = require('../assets/avatar1.png'); } catch {}

  function load() { setParcels(getAllParcels()); }
  useEffect(() => { loadParcelsFromFirestore().then(() => load()); }, []);

  async function handleToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await toggleComplete(id);
    load();
  }

  const filtered = parcels.filter(p => {
    const matchSearch =
      p.apn.toLowerCase().includes(search.toLowerCase()) ||
      p.assessedOwner.toLowerCase().includes(search.toLowerCase()) ||
      p.legalOwner.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase()) ||
      p.county.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && !p.completed) ||
      (filter === 'completed' && p.completed);
    return matchSearch && matchFilter;
  });

  const pending = parcels.filter(p => !p.completed).length;
  const done = parcels.filter(p => p.completed).length;

  return (
    <div>
      {/* Header with avatar and counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '0 40px 40px 0', padding: '8px 24px 8px 12px',
        }}>
          {avatarSrc && <img src={avatarSrc} alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />}
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
            {profile?.displayName || 'User'}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>My Parcels</div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {pending} pending &bull; {done} completed &bull; {parcels.length} total
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ marginBottom: 16 }}>
        <input className="filter-input" placeholder="Search by APN, Owner, County..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 400 }} />
      </div>

      {/* Dashboard banner */}
      <div style={{
        background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)',
        borderRadius: '20px 20px 0 0', padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 40,
        fontWeight: 700, fontSize: 16,
      }}>
        <span>Dashboard</span>
        <span style={{ flex: 1 }}>Property</span>
        <span style={{ width: 120 }}>Status</span>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          style={{
            background: 'transparent', border: 'none', color: 'inherit',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}>
          <option value="all" style={{ color: '#000' }}>Filter</option>
          <option value="pending" style={{ color: '#000' }}>Pending</option>
          <option value="completed" style={{ color: '#000' }}>Completed</option>
        </select>
      </div>

      {/* Parcel rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
            No parcels found. Click "New Parcel" to add your first one.
          </div>
        )}
        {filtered.map(parcel => (
          <div key={parcel.id} onClick={() => onSelectParcel(parcel)} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '14px 24px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'background 0.1s',
            opacity: parcel.completed ? 0.5 : 1,
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
            <input type="checkbox" checked={parcel.completed}
              onClick={e => handleToggle(e, parcel.id)} onChange={() => {}}
              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--accent-primary)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{parcel.apn || 'No APN'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {parcel.assessedOwner || parcel.legalOwner || 'No owner'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {parcel.county}{parcel.state ? `, ${parcel.state}` : ''}
                {parcel.acres ? ` \u2022 ${parcel.acres} acres` : ''}
              </div>
            </div>
            <span style={{
              width: 120, fontSize: 13, fontWeight: 500,
              color: parcel.completed ? 'var(--badge-done-text)' : 'var(--badge-pending-text)',
            }}>
              {parcel.completed ? 'Completed' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      {showBatchTax && onCloseBatchTax && (
        <BatchTaxImporter onClose={onCloseBatchTax} onComplete={() => { load(); onCloseBatchTax(); }} />
      )}
      {showBatchProp && onCloseBatchProp && (
        <BatchPropertyCardImporter onClose={onCloseBatchProp} onComplete={() => { load(); onCloseBatchProp(); }} />
      )}
    </div>
  );
}