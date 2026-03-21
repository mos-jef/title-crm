import backIconUrl from '../assets/backicon.svg';
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
type Tab = 'info' | 'documents' | 'legal';

export default function ParcelDetail({ parcel: initialParcel, onBack, onForward }: Props) {
  const [parcel, setParcel] = useState(initialParcel);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initialParcel);
  const [files, setFiles] = useState<Record<string, { name: string; path: string }[]>>({});
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState<{ name: string; path: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [showSummary, setShowSummary] = useState(false);
  const [showTaxReader, setShowTaxReader] = useState(false);
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);

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

  useEffect(() => {
    async function loadTractNumber() {
      try {
        const result = await (window as any).electronAPI.fetchCenterline();
        if (result.success && result.mapping) {
          setTractNumber(result.mapping[parcel.apn] || null);
        }
      } catch (e) { console.warn('Could not load centerline mapping:', e); }
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
    if (!(window as any).electronAPI || !parcel.folderPath) return;
    const result = await (window as any).electronAPI.addFileToParcel({
      parcelId: parcel.id, folderPath: parcel.folderPath, category,
    });
    if (result && result.success) loadFiles();
  }

  async function handleDrop(e: React.DragEvent, category: string) {
    e.preventDefault();
    setDraggingOver(null);
    if (category === TOSYNC && draggingFile) {
      setDraggingFile(null);
      if (!parcel.folderPath) return;
      await (window as any).electronAPI.copyToToSync({
        sourcePath: draggingFile.path,
        toSyncFolder: parcel.folderPath + '\\ToSync',
        fileName: draggingFile.name,
      });
      await loadFiles();
      return;
    }
    setDraggingFile(null);
    if (!parcel.folderPath) return;
    for (const file of Array.from(e.dataTransfer.files)) {
      const filePath = (file as any).path;
      if (filePath) {
        await (window as any).electronAPI.addFileToParcel({
          parcelId: parcel.id, folderPath: parcel.folderPath, category, sourcePath: filePath,
        });
      }
    }
    loadFiles();
  }

  async function handleOpenFile(filePath: string) {
    if ((window as any).electronAPI) await (window as any).electronAPI.openFile(filePath);
  }

  async function handleOpenFolder() {
    if ((window as any).electronAPI && parcel.folderPath)
      await (window as any).electronAPI.openFolder(parcel.folderPath);
  }

  async function handleToggleComplete() {
    await toggleComplete(parcel.id);
    setParcel(p => ({ ...p, completed: !p.completed }));
  }

  async function handleDelete() {
    if (!window.confirm(`Permanently delete parcel ${parcel.apn}? This cannot be undone.`)) return;
    if ((window as any).electronAPI && parcel.folderPath)
      await (window as any).electronAPI.deleteParcelFolder(parcel.folderPath);
    await deleteParcel(parcel.id);
    onBack();
  }

  async function handleDeleteTosyncFile(filePath: string, fileName: string) {
    if (!window.confirm(`Remove "${fileName}" from ToSync?`)) return;
    await (window as any).electronAPI.deleteTosyncFile(filePath);
    await loadFiles();
  }

  async function handleRenameConfirm() {
    if (!renamingFile || !renameValue.trim()) return;
    const result = await (window as any).electronAPI.renameTosyncFile({
      oldPath: renamingFile.path, newName: renameValue.trim(),
    });
    if (result.success) { setRenamingFile(null); setRenameValue(''); await loadFiles(); }
    else alert('Rename failed: ' + result.error);
  }

  async function handleSyncToSharePoint() {
    if (!tractNumber) return;
    setSyncing(true); setSyncStatus('Syncing...');
    const result = await (window as any).electronAPI.syncToSharePoint({
      toSyncFolder: parcel.folderPath + '\\ToSync', tractNumber,
    });
    setSyncing(false);
    setSyncStatus(result.success
      ? `Synced ${result.copied} file${result.copied !== 1 ? 's' : ''}`
      : `Failed: ${result.error}`);
    setTimeout(() => setSyncStatus(''), 5000);
  }

  if (showSummary) {
    return <div className="detail-container">
      <ParcelSummary parcel={parcel} onClose={() => setShowSummary(false)} />
    </div>;
  }

  const toSyncFiles = files[TOSYNC] || [];
 

  // ── Tab styles ──
  const tabStyle = (tab: Tab | 'folder') => ({
    padding: '10px 32px',
    fontSize: 16,
    fontWeight: 700 as const,
    border: '1px solid var(--border)',
    borderBottom: 'none',
    borderRadius: '16px 16px 0 0',
    cursor: 'pointer' as const,
    background: activeTab === tab ? 'var(--accent-yellow, #E8BF1B)' : 'var(--bg-tertiary)',
    color: activeTab === tab ? '#000' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  });

  // ── Reusable field display/edit ──
  function renderField(label: string, field: string, opts?: { textarea?: boolean; wide?: boolean }) {
    const val = (parcel as any)[field] || '';
    const formVal = (form as any)[field] || '';
    if (editing) {
      return (
        <div style={{ flex: opts?.wide ? 1 : undefined, minWidth: opts?.wide ? 300 : 180 }}>
          <div className="field-label">{label}</div>
          {opts?.textarea ? (
            <textarea className="field-input textarea"
              style={{ minHeight: opts?.wide ? 300 : 100 }}
              value={formVal} onChange={e => handleChange(field, e.target.value)} />
          ) : (
            <input className="field-input" value={formVal}
              onChange={e => handleChange(field, e.target.value)} />
          )}
        </div>
      );
    }
    return (
      <div style={{ flex: opts?.wide ? 1 : undefined, minWidth: opts?.wide ? 300 : 180 }}>
        <div className="field-label">{label}</div>
        <div className="field-value" style={opts?.textarea ? { minHeight: opts?.wide ? 300 : 100 } : {}}>
          {field === 'briefLegal' ? (formatBriefLegal(parcel) || '--') : (val || '--')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Back button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 14,
        }}>

          <img src={backIconUrl} alt="Back" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'var(--icon-filter, none)' }} />
          
        </button>
        {onForward && (
          <button onClick={onForward} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--text-secondary)', fontSize: 24,
          }}>&#8594;</button>
        )}
      </div>

      {/* Dashboard banner */}
      <div style={{
        background: 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-text)',
        borderRadius: '20px 20px 0 0',
        padding: '12px 24px',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</div>
        <div style={{ fontSize: 15, marginTop: 2 }}>
          {parcel.apn || 'No APN'}
          {parcel.assessedOwner ? `  \u2022  ${parcel.assessedOwner}` : ''}
          {parcel.acres ? `  \u2022  ${parcel.acres} Acres` : ''}
          {parcel.county ? `  \u2022  ${parcel.county}, ${parcel.state || ''}` : ''}
        </div>
        {tractNumber && <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{tractNumber}</div>}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
        <button style={tabStyle('info')} onClick={() => setActiveTab('info')}>Info</button>
        <button style={tabStyle('documents')} onClick={() => setActiveTab('documents')}>Documents</button>
        <button style={tabStyle('legal')} onClick={() => setActiveTab('legal')}>Legal</button>
        <button style={{
          ...tabStyle('folder'),
          background: 'var(--bg-tertiary)',
          display: 'flex', alignItems: 'center', gap: 8,
        }} onClick={handleOpenFolder}>
          <span style={{ fontSize: 18 }}>&#128193;</span> Open Folder
        </button>
      </div>

      {/* Tab content area */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '0 16px 16px 16px',
        padding: 28,
        minHeight: 500,
      }}>

        {/* ═══ INFO TAB ═══ */}
        {activeTab === 'info' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={handleSave} style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Save</button>
                  <button className="btn-secondary" onClick={() => setEditing(false)} style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Cancel</button>
                </div>
              ) : (
                <button className="btn-primary" onClick={() => { setForm(parcel); setEditing(true); }}
                  style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Edit</button>
              )}
            </div>

            {/* Row 1 */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
              {renderField('APN', 'apn')}
              {renderField('Parcel No.', 'mapParcelNo')}
              {renderField('State', 'state')}
              {renderField('County', 'county')}
            </div>

            {/* Row 2 */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
              {renderField('Acres', 'acres')}
              {renderField('Assessed Owner', 'assessedOwner')}
              {renderField('Legal Owner', 'legalOwner')}
              {renderField('Vesting Deed No.', 'vestingDeedNo')}
            </div>

            {/* Row 3 */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
              {renderField('Brief Legal', 'briefLegal')}
              {renderField('Address', 'address')}
              {renderField('Tract Type', 'tractType')}
            </div>

            {/* Row 4: Notes + Full Legal side by side */}
            <div style={{ display: 'flex', gap: 24 }}>
              {renderField('Notes', 'notes', { textarea: true, wide: true })}
              {renderField('Full Legal', 'legalDescription', { textarea: true, wide: true })}
            </div>

            {/* Action links */}
            <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowTaxReader(true)}>Read Tax Card</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowPackageBuilder(true)}>Build Package</span>
              <span style={{ cursor: 'pointer' }} onClick={() => setShowSummary(true)}>Summary</span>
              <span style={{ cursor: 'pointer' }} onClick={handleToggleComplete}>
                {parcel.completed ? 'Mark Pending' : 'Mark Complete'}
              </span>
              <span style={{ cursor: 'pointer', color: 'var(--accent-red, #ef4444)' }} onClick={handleDelete}>Delete</span>
            </div>
          </div>
        )}

        {/* ═══ DOCUMENTS TAB ═══ */}
        {activeTab === 'documents' && (
          <div>
            <div className="doc-zones">
              {CATEGORIES.map(cat => {
                const catFiles = files[cat] || [];
                const isDragging = draggingOver === cat;
                return (
                  <div key={cat} className="doc-zone"
                    style={{ borderColor: isDragging ? 'var(--accent-primary)' : undefined }}
                    onDragOver={e => { e.preventDefault(); setDraggingOver(cat); }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={e => handleDrop(e, cat)}>
                    <div className="doc-zone-header">
                      <div className="doc-zone-title">
                        {cat}
                        {catFiles.length > 0 && (
                          <span style={{
                            marginLeft: 8, background: 'var(--accent-primary)', color: 'var(--btn-primary-text)',
                            borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                          }}>{catFiles.length}</span>
                        )}
                      </div>
                      <button className="doc-zone-add" onClick={() => handleAddFile(cat)}>Add+</button>
                    </div>
                    <div className="doc-file-list">
                      {isDragging && <div style={{ color: 'var(--accent-primary)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>Drop to add</div>}
                      {catFiles.length === 0 && !isDragging
                        ? <div className="doc-empty">Drop files here or click Add+</div>
                        : catFiles.map(file => (
                          <div key={file.path} className="doc-file-item"
                            draggable onDragStart={() => setDraggingFile(file)} onDragEnd={() => setDraggingFile(null)}
                            onClick={() => handleOpenFile(file.path)} title="Click to open">
                            {file.name}
                          </div>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ToSync section */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Sync</h3>
                  {toSyncFiles.length > 0 && (
                    <span style={{ background: 'var(--accent-primary)', color: 'var(--btn-primary-text)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                      {toSyncFiles.length}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {syncStatus && <span style={{ fontSize: 12, color: syncStatus.startsWith('Synced') ? 'var(--accent-green)' : 'var(--accent-red)' }}>{syncStatus}</span>}
                  <button className="btn-primary" onClick={handleSyncToSharePoint}
                    disabled={syncing || toSyncFiles.length === 0 || !tractNumber}
                    style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20 }}>
                    {syncing ? 'Syncing...' : 'Sync'}
                  </button>
                </div>
              </div>
              <div className="doc-zone" style={{ borderColor: draggingOver === TOSYNC ? 'var(--accent-primary)' : undefined, borderStyle: 'dashed' }}
                onDragOver={e => { e.preventDefault(); setDraggingOver(TOSYNC); }}
                onDragLeave={() => setDraggingOver(null)}
                onDrop={e => handleDrop(e, TOSYNC)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {draggingOver === TOSYNC ? 'Drop to copy here' : 'Drag files from above to sync'}
                  </span>
                  <button className="doc-zone-add" onClick={() => handleAddFile(TOSYNC)}>Add+</button>
                </div>
                {toSyncFiles.length === 0
                  ? <div className="doc-empty">Drag files from categories above, or click Add+</div>
                  : <div className="doc-file-list">
                    {toSyncFiles.map(file => (
                      <div key={file.path} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6, fontSize: 13 }}>
                        {renamingFile?.path === file.path ? (
                          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                            <input className="field-input" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') { setRenamingFile(null); setRenameValue(''); } }}
                              style={{ fontSize: 13, padding: '4px 8px', flex: 1 }} autoFocus />
                            <button className="btn-primary" onClick={handleRenameConfirm} style={{ fontSize: 12, padding: '4px 10px' }}>OK</button>
                            <button className="btn-secondary" onClick={() => { setRenamingFile(null); setRenameValue(''); }} style={{ fontSize: 12, padding: '4px 10px' }}>X</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ color: 'var(--text-secondary)', cursor: 'pointer', flex: 1 }} onClick={() => handleOpenFile(file.path)}>{file.name}</div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => { setRenamingFile(file); setRenameValue(file.name); }}
                                style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 4, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>Rename</button>
                              <button onClick={() => handleDeleteTosyncFile(file.path, file.name)}
                                style={{ background: 'none', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', borderRadius: 4, fontSize: 11, padding: '2px 8px', cursor: 'pointer' }}>X</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ═══ LEGAL TAB ═══ */}
        {activeTab === 'legal' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" onClick={handleSave} style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Save</button>
                  <button className="btn-secondary" onClick={() => setEditing(false)} style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Cancel</button>
                </div>
              ) : (
                <button className="btn-primary" onClick={() => { setForm(parcel); setEditing(true); }}
                  style={{ borderRadius: 20, padding: '7px 22px', fontSize: 13 }}>Edit</button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {renderField('Parcel No.', 'mapParcelNo')}
              {renderField('Brief Legal', 'briefLegal')}
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              {renderField('Notes', 'notes', { textarea: true, wide: true })}
              {renderField('Full Legal', 'legalDescription', { textarea: true, wide: true })}
            </div>
          </div>
        )}
      </div>

      {showTaxReader && (
        <TaxCardReader parcel={parcel}
          onFieldsExtracted={(fields) => {
            const updated = { ...parcel, ...fields, updatedAt: new Date().toISOString() };
            upsertParcel(updated); setParcel(updated); setForm(updated);
          }}
          onClose={() => setShowTaxReader(false)} />
      )}

      {showPackageBuilder && (
        <PackageBuilder parcel={parcel} files={files} onClose={() => setShowPackageBuilder(false)} />
      )}
    </div>
  );
}