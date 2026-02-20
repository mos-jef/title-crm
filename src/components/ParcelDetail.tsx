import React, { useCallback, useEffect, useState } from 'react';
import { deleteParcel, Parcel, toggleComplete, upsertParcel } from '../database';
import ParcelSummary from './ParcelSummary';
import TaxCardReader from './TaxCardReader';
import PackageBuilder from './PackageBuilder';

interface Props {
  parcel: Parcel;
  onBack: () => void;
}

const CATEGORIES = ['Maps', 'Vesting Deed', 'Easements', 'Chain', 'Taxes', 'Miscellaneous'];

const CAT_ICONS: Record<string, string> = {
  'Maps': '🗺',
  'Vesting Deed': '📄',
  'Easements': '📐',
  'Chain': '🔗',
  'Taxes': '🧾',
  'Miscellaneous': '📎',
};

export default function ParcelDetail({ parcel: initialParcel, onBack }: Props) {
  const [parcel, setParcel] = useState(initialParcel);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initialParcel);
  const [files, setFiles] = useState<Record<string, { name: string; path: string }[]>>({});
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  
  const [showSummary, setShowSummary] = useState(false);
  const [showTaxReader, setShowTaxReader] = useState(false);
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);  

  const loadFiles = useCallback(async () => {
    if ((window as any).electronAPI && parcel.folderPath) {
      const result = await (window as any).electronAPI.getParcelFiles(parcel.folderPath);
      setFiles(result);
    }
  }, [parcel.folderPath]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSave() {
    const updated = { ...form, updatedAt: new Date().toISOString() };
    upsertParcel(updated);
    setParcel(updated);
    setEditing(false);
  }

  async function handleAddFile(category: string) {
    if (!(window as any).electronAPI) return;
    if (!parcel.folderPath) {
      alert('This parcel has no folder path. Please delete and recreate it.');
      return;
    }
    const result = await (window as any).electronAPI.addFileToParcel({
      parcelId: parcel.id,
      folderPath: parcel.folderPath,
      category,
    });
    if (result && result.success) loadFiles();
  }

  async function handleDrop(e: React.DragEvent, category: string) {
    e.preventDefault();
    setDraggingOver(null);
    if (!parcel.folderPath) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      const filePath = (file as any).path;
      if (filePath && (window as any).electronAPI) {
        await (window as any).electronAPI.addFileToParcel({
          parcelId: parcel.id,
          folderPath: parcel.folderPath,
          category,
          sourcePath: filePath,
        });
      }
    }
    loadFiles();
  }

  async function handleOpenFile(filePath: string) {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.openFile(filePath);
    }
  }

  async function handleOpenFolder() {
    if ((window as any).electronAPI && parcel.folderPath) {
      await (window as any).electronAPI.openFolder(parcel.folderPath);
    }
  }

  function handleToggleComplete() {
    toggleComplete(parcel.id);
    setParcel(p => ({ ...p, completed: !p.completed }));
    }
    
    async function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete parcel ${parcel.apn} and all its files? This cannot be undone.`
    );
    if (!confirmed) return;
    if ((window as any).electronAPI && parcel.folderPath) {
      await (window as any).electronAPI.deleteParcelFolder(parcel.folderPath);
    }
    deleteParcel(parcel.id);
    onBack();
  }

  if (showSummary) {
    return (
      <div className="detail-container">
        <ParcelSummary parcel={parcel} onClose={() => setShowSummary(false)} />
      </div>
    );
  }

  const fields = [
    { label: 'APN', field: 'apn' },
    { label: 'Map / Parcel No.', field: 'mapParcelNo' },
    { label: 'County', field: 'county' },
    { label: 'State', field: 'state' },
    { label: 'Address', field: 'address' },
    { label: 'Tract Type', field: 'tractType' },
    { label: 'Acres', field: 'acres' },
    { label: 'Vesting Deed No.', field: 'vestingDeedNo' },
    { label: 'Assessed Owner', field: 'assessedOwner' },
    { label: 'Legal Owner', field: 'legalOwner' },
    { label: 'Brief Legal', field: 'briefLegal' },
    { label: 'Legal Description', field: 'legalDescription' },
  ];

  return (
    <div className="detail-container">
      <button className="back-btn" onClick={onBack}>← Back to List</button>

      {/* Header */}
      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ borderBottom: 'none', marginBottom: 4 }}>{parcel.apn || 'No APN'}</h2>
            <div style={{ color: '#6b7280', fontSize: 14 }}>
              {parcel.county}{parcel.state ? `, ${parcel.state}` : ''}
              {parcel.tractType ? ` · ${parcel.tractType}` : ''}
              {parcel.acres ? ` · ${parcel.acres} acres` : ''}
            </div>
            {!parcel.folderPath && (
              <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 6 }}>
                ⚠️ No folder linked — delete and recreate this parcel to generate a folder
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
             {parcel.folderPath && (
              <button className="btn-secondary" onClick={handleOpenFolder}
                style={{ fontSize: 13, padding: '8px 14px' }}>
                📁 Open Folder
              </button>
            )}
            <button className="btn-secondary"
              onClick={() => setShowTaxReader(true)}
              style={{ fontSize: 13, padding: '8px 14px' }}>
              🧾 Read Tax Card
            </button>
            <button className="btn-secondary"
              onClick={() => setShowPackageBuilder(true)}
              style={{ fontSize: 13, padding: '8px 14px' }}>
              📦 Build Package
            </button>
            <button
              className={parcel.completed ? 'btn-secondary' : 'btn-primary'}
              onClick={handleToggleComplete}
              style={{ fontSize: 13, padding: '8px 14px' }}>
              {parcel.completed ? '↩ Mark Pending' : '✓ Mark Complete'}
            </button>
            <button className="btn-secondary"
            onClick={() => setShowSummary(true)}
            style={{ fontSize: 13, padding: '8px 14px' }}>
            📋 Summary
            </button>
            <button className="btn-secondary"
              onClick={() => { setForm(parcel); setEditing(!editing); }}
              style={{ fontSize: 13, padding: '8px 14px' }}>
              {editing ? 'Cancel' : '✏️ Edit'}
                      </button>
                      <button
            onClick={handleDelete}
            style={{
                fontSize: 13,
                padding: '8px 14px',
                background: 'none',
                border: '1px solid #7f1d1d',
                color: '#ef4444',
                borderRadius: 8,
                cursor: 'pointer',
            }}>
            🗑 Delete
            </button>
          </div>
        </div>
      </div>

      {/* Parcel Info */}
      <div className="detail-card">
        <h2>Parcel Information</h2>
        {editing ? (
          <>
            <div className="field-grid">
              {fields.slice(0, 10).map(({ label, field }) => (
                <div className="field-group" key={field}>
                  <label className="field-label">{label}</label>
                  <input className="field-input" value={(form as any)[field] || ''}
                    onChange={e => handleChange(field, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="field-grid single" style={{ marginTop: 16 }}>
              {fields.slice(10).map(({ label, field }) => (
                <div className="field-group" key={field}>
                  <label className="field-label">{label}</label>
                  <textarea className="field-input textarea" value={(form as any)[field] || ''}
                    onChange={e => handleChange(field, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button className="btn-primary" onClick={handleSave}>Save Changes</button>
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </>
        ) : (
          <div className="field-grid">
            {fields.map(({ label, field }) => (
              <div className="field-group" key={field}>
                <div className="field-label">{label}</div>
                <div className="field-value">{(parcel as any)[field] || '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="detail-card">
        <h2>Documents</h2>
        <div className="doc-zones">
          {CATEGORIES.map(cat => {
            const catFiles = files[cat] || [];
            const isDragging = draggingOver === cat;
            return (
              <div
                key={cat}
                className="doc-zone"
                style={{ borderColor: isDragging ? '#4f8ef7' : undefined }}
                onDragOver={e => { e.preventDefault(); setDraggingOver(cat); }}
                onDragLeave={() => setDraggingOver(null)}
                onDrop={e => handleDrop(e, cat)}
              >
                <div className="doc-zone-header">
                  <div className="doc-zone-title">
                    {CAT_ICONS[cat]} {cat}
                    {catFiles.length > 0 && (
                      <span style={{
                        marginLeft: 8,
                        background: '#4f8ef7',
                        color: 'white',
                        borderRadius: 10,
                        padding: '1px 7px',
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        {catFiles.length}
                      </span>
                    )}
                  </div>
                  <button className="doc-zone-add" onClick={() => handleAddFile(cat)}>
                    + Add
                  </button>
                </div>
                <div className="doc-file-list">
                  {isDragging && (
                    <div style={{ color: '#4f8ef7', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                      Drop to add
                    </div>
                  )}
                  {catFiles.length === 0 && !isDragging ? (
                    <div className="doc-empty">Drop files here or click + Add</div>
                  ) : (
                    catFiles.map(file => (
                      <div
                        key={file.path}
                        className="doc-file-item"
                        onClick={() => handleOpenFile(file.path)}
                        title={file.path}
                      >
                        📄 {file.name}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    {showTaxReader && (
        <TaxCardReader
          parcel={parcel}
          onFieldsExtracted={(fields) => {
            const updated = { ...parcel, ...fields, updatedAt: new Date().toISOString() };
            upsertParcel(updated);
            setParcel(updated);
            setForm(updated);
          }}
          onClose={() => setShowTaxReader(false)}
        />
      )}

      {showPackageBuilder && (
        <PackageBuilder
          parcel={parcel}
          files={files}
          onClose={() => setShowPackageBuilder(false)}
        />
      )}
    </div>
  );
}