import React, { useEffect, useState } from 'react';
import { Parcel, getAllParcels, toggleComplete } from '../database';

interface Props {
  onSelectParcel: (parcel: Parcel) => void;
}

export default function ParcelList({ onSelectParcel }: Props) {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  function load() {
    setParcels(getAllParcels());
  }

  useEffect(() => { load(); }, []);

  function handleToggle(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    toggleComplete(id);
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
      <div className="page-header">
        <div>
          <div className="page-title">My Parcels</div>
          <div className="page-subtitle">
            {pending} pending · {done} completed · {parcels.length} total
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="filter-input"
          placeholder="Search by APN, owner, county..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="filter-select"
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="parcel-grid">
        {filtered.length === 0 && (
          <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 40 }}>
            No parcels found. Click "+ New Parcel" to add your first one.
          </div>
        )}
        {filtered.map(parcel => (
          <div
            key={parcel.id}
            className={`parcel-card ${parcel.completed ? 'completed' : ''}`}
            onClick={() => onSelectParcel(parcel)}
          >
            <input
              type="checkbox"
              className="parcel-checkbox"
              checked={parcel.completed}
              onClick={e => handleToggle(e, parcel.id)}
              onChange={() => {}}
            />
            <div className="parcel-info">
              <div className="parcel-apn">{parcel.apn || 'No APN'}</div>
              <div className="parcel-owner">
                {parcel.assessedOwner || parcel.legalOwner || 'No owner listed'}
                </div>   
              <div className="parcel-meta">
                {parcel.county}{parcel.state ? `, ${parcel.state}` : ''}
                {parcel.acres ? ` · ${parcel.acres} acres` : ''}
                {parcel.tractType ? ` · ${parcel.tractType}` : ''}
                </div>    
            </div>
            <span className={`status-badge ${parcel.completed ? 'done' : 'pending'}`}>
              {parcel.completed ? '✓ Done' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}