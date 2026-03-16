import React, { useCallback, useEffect, useState } from 'react';
import { deleteParcel, formatBriefLegal, Parcel, toggleComplete, upsertParcel } from '../database';
import ParcelSummary from './ParcelSummary';
import TaxCardReader from './TaxCardReader';
import PackageBuilder from './PackageBuilder';

interface Props {
  parcel: Parcel;
  onBack: () => void;
  onForward?: () => void;
}

const CATEGORIES = ['Maps', 'Vesting Deed', 'Easements', 'Chain', 'Taxes', 'Miscellaneous'];
const TOSYNC = 'ToSync';

const CAT_ICONS: Record<string, string> = {
  'Maps': '🗺',
  'Vesting Deed': '📄',
  'Easements': '📐',
  'Chain': '🔗',
  'Taxes': '🧾',
  'Miscellaneous': '📎',
  'ToSync': '☁️',
};

export default function ParcelDetail({ parcel: initialParcel, onBack, onForward }: Props) {
  const [parcel, setParcel] = useState(initialParcel);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initialParcel);
  const [files, setFiles] = useState<Record<string, { name: string; path: string }[]>>({});
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState<{ name: string; path: string } | null>(null);

  const [showSummary, setShowSummary] = useState(false);
  const [showTaxReader, setShowTaxReader] = useState(false);
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);

  // ToSync state
  const [renamingFile, setRenamingFile] = useState<{ path: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [tractNumber, setTractNumber] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  const loadFiles = useCallback(async () => {
    if ((window as any).electronAPI && parcel.folderPath) {
      const result = await (window as any).electronAPI.getParcelFiles(parcel.folderPath);
      setFiles(result);
    }
  }, [parcel.folderPath]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Load centerline mapping on mount to find tract number for this parcel
  useEffect(() => {
    async function loadTractNumber() {
      try {
        const result = await (window as any).electronAPI.fetchCenterline();
        if (result.success && result.mapping) {
          const tract = result.mapping[parcel.apn] || null;
          setTractNumber(tract);
        }
      } catch (e) {
        console.warn('Could not load centerline mapping:', e);
      }
    }
    loadTractNumber();
  }, [parcel.apn]);

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

    // Check if this is an internal file drag (from another category to ToSync)
    if (category === TOSYNC && draggingFile) {
      setDraggingFile(null);
      if (!parcel.folderPath) return;
      const toSyncFolder = parcel.folderPath + '\\ToSync';
      try {
        await (window as any).electronAPI.copyToToSync({
          sourcePath: draggingFile.path,
          toSyncFolder,
          fileName: draggingFile.name,
        });
        await loadFiles();
      } catch (e) {
        console.warn('Could not copy to ToSync:', e);
      }
      return;
    }

    setDraggingFile(null);
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

  async function handleToggleComplete() {
    await toggleComplete(parcel.id);
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
    await deleteParcel(parcel.id);
    onBack();
  }

  async function handleDeleteTosyncFile(filePath: string, fileName: string) {
    const confirmed = window.confirm(`Remove "${fileName}" from ToSync? This only removes the copy in ToSync, not the original.`);
    if (!confirmed) return;
    await (window as any).electronAPI.deleteTosyncFile(filePath);
    await loadFiles();
  }

  async function handleRenameConfirm() {
    if (!renamingFile || !renameValue.trim()) return;
    const result = await (window as any).electronAPI.renameTosyncFile({
      oldPath: renamingFile.path,
      newName: renameValue.trim(),
    });
    if (result.success) {
      setRenamingFile(null);
      setRenameValue('');
      await loadFiles();
    } else {
      alert('Rename failed: ' + result.error);
    }
  }

  async function handleSyncToSharePoint() {
    if (!tractNumber) return;
    setSyncing(true);
    setSyncStatus('Syncing...');
    const toSyncFolder = parcel.folderPath + '\\ToSync';
    const result = await (window as any).electronAPI.syncToSharePoint({
      toSyncFolder,
      tractNumber,
    });
    setSyncing(false);
    if (result.success) {
      setSyncStatus(`✓ Synced ${result.copied} file${result.copied !== 1 ? 's' : ''} to SharePoint`);
    } else {
      setSyncStatus(`✕ Sync failed: ${result.error}`);
    }
    setTimeout(() => setSyncStatus(''), 5000);
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
    { label: 'Notes', field: 'notes' }
  ];

  const toSyncFiles = files[TOSYNC] || [];

  return (
    <div className="detail-container">

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 0 }}>
          ← Back to List
        </button>
        {onForward && (
          <button className="back-btn" onClick={onForward} style={{ marginBottom: 0 }}>
            → Forward
          </button>
        )}
      </div>

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
            {tractNumber && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                📋 {tractNumber}
              </div>
            )}
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
              onClick={loadFiles}
              style={{ fontSize: 13, padding: '8px 14px' }}
              title="Refresh file list from disk">
              🔄 Refresh
            </button>
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
                fontSize: 13, padding: '8px 14px',
                background: 'none', border: '1px solid #7f1d1d',
                color: '#ef4444', borderRadius: 8, cursor: 'pointer',
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
                <div className="field-value">
                  {field === 'briefLegal'
                    ? formatBriefLegal(parcel) || '—'
                    : (parcel as any)[field] || '—'}
                </div>
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
                        marginLeft: 8, background: '#4f8ef7', color: 'white',
                        borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
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
                        draggable
                        onDragStart={() => setDraggingFile(file)}
                        onDragEnd={() => setDraggingFile(null)}
                        onClick={() => handleOpenFile(file.path)}
                        title={`Click to open · Drag to ToSync to copy`}
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

        {/* ToSync Section */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                ☁️ ToSync
              </h3>
              {toSyncFiles.length > 0 && (
                <span style={{
                  background: '#4f8ef7', color: 'white',
                  borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                }}>
                  {toSyncFiles.length}
                </span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Drag files from above categories to copy them here
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {syncStatus && (
                <span style={{
                  fontSize: 12,
                  color: syncStatus.startsWith('✓') ? '#86efac' : '#f87171',
                }}>
                  {syncStatus}
                </span>
              )}
              {tractNumber ? (
                <button
                  className="btn-primary"
                  onClick={handleSyncToSharePoint}
                  disabled={syncing || toSyncFiles.length === 0}
                  style={{ fontSize: 12, padding: '6px 14px' }}
                  title={`Sync to SharePoint: ${tractNumber}`}
                >
                  {syncing ? '⟳ Syncing...' : '☁ Sync to SharePoint'}
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  disabled
                  style={{ fontSize: 12, padding: '6px 14px', opacity: 0.5, cursor: 'not-allowed' }}
                  title="No matching tract number found in centerline list"
                >
                  ☁ Sync to SharePoint
                </button>
              )}
            </div>
          </div>

          <div
            className="doc-zone"
            style={{
              borderColor: draggingOver === TOSYNC ? '#a78bfa' : undefined,
              borderStyle: 'dashed',
            }}
            onDragOver={e => { e.preventDefault(); setDraggingOver(TOSYNC); }}
            onDragLeave={() => setDraggingOver(null)}
            onDrop={e => handleDrop(e, TOSYNC)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {draggingOver === TOSYNC ? '📥 Drop to copy here' : 'Files queued for SharePoint sync'}
              </span>
              <button className="doc-zone-add" onClick={() => handleAddFile(TOSYNC)}>
                + Add
              </button>
            </div>

            {toSyncFiles.length === 0 ? (
              <div className="doc-empty">
                Drag files from other categories above, or click + Add
              </div>
            ) : (
              <div className="doc-file-list">
                {toSyncFiles.map(file => (
                  <div key={file.path} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: 'var(--bg-card)',
                    borderRadius: 6, fontSize: 13,
                  }}>
                    {renamingFile?.path === file.path ? (
                      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                        <input
                          className="field-input"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameConfirm();
                            if (e.key === 'Escape') { setRenamingFile(null); setRenameValue(''); }
                          }}
                          style={{ fontSize: 13, padding: '4px 8px', flex: 1 }}
                          autoFocus
                        />
                        <button className="btn-primary" onClick={handleRenameConfirm}
                          style={{ fontSize: 12, padding: '4px 10px' }}>
                          ✓
                        </button>
                        <button className="btn-secondary" onClick={() => { setRenamingFile(null); setRenameValue(''); }}
                          style={{ fontSize: 12, padding: '4px 10px' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{ color: 'var(--text-secondary)', cursor: 'pointer', flex: 1 }}
                          onClick={() => handleOpenFile(file.path)}
                        >
                          📄 {file.name}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setRenamingFile(file); setRenameValue(file.name); }}
                            style={{
                              background: 'none', border: '1px solid var(--border)',
                              color: 'var(--text-muted)', borderRadius: 4,
                              fontSize: 11, padding: '2px 8px', cursor: 'pointer',
                            }}
                            title="Rename this file in ToSync"
                          >
                            ✏
                          </button>
                          <button
                            onClick={() => handleDeleteTosyncFile(file.path, file.name)}
                            style={{
                              background: 'none', border: '1px solid #7f1d1d',
                              color: '#ef4444', borderRadius: 4,
                              fontSize: 11, padding: '2px 8px', cursor: 'pointer',
                            }}
                            title="Remove from ToSync (original file is kept)"
                          >
                            🗑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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