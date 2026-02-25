import React, { useState } from 'react';
import { Parcel, upsertParcel, loadParcelsFromFirestore } from '../database';

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

interface FileResult {
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'matched' | 'no-match' | 'error';
  apn?: string;
  matchedParcel?: string;
  error?: string;
}

function normalizeApn(raw: string): string {
  return (raw || '').replace(/[\s\-.]/g, '').toLowerCase();
}

async function extractApnFromPdf(base64: string): Promise<string> {
  const result = await (window as any).electronAPI.claudeExtractTaxCard({ base64 });
  if (!result.success) throw new Error(result.error || 'Extraction failed');
  return result.extracted?.apn || '';
}

export default function BatchPropertyCardImporter({ onClose, onComplete }: Props) {
  const [results, setResults] = useState<FileResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [folderPath, setFolderPath] = useState('');

  async function handleSelectFolder() {
    const picked = await (window as any).electronAPI.pickFolder();
    if (!picked.success) return;

    const folder = picked.folderPath;
    setFolderPath(folder);

    const result = await (window as any).electronAPI.scanFolderForPdfs(folder);
    if (!result.success || result.files.length === 0) {
      alert('No PDF files found in that folder.');
      return;
    }

    setResults(result.files.map((f: any) => ({
      fileName: f.name,
      filePath: f.path,
      status: 'pending',
    })));
  }

  async function handleRun() {
    if (results.length === 0) return;
    setRunning(true);
    setDone(false);

    const allParcels = await loadParcelsFromFirestore();
    const updated = [...results];

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];

      updated[i] = { ...updated[i], status: 'processing' };
      setResults([...updated]);

      try {
        const readResult = await (window as any).electronAPI.readPdfBase64(item.filePath);
        if (!readResult.success) {
          updated[i] = { ...updated[i], status: 'error', error: 'Could not read file' };
          setResults([...updated]);
          continue;
        }

        const apnRaw = await extractApnFromPdf(readResult.base64);
        const apnNorm = normalizeApn(apnRaw);

        if (!apnNorm) {
          updated[i] = { ...updated[i], status: 'no-match', apn: 'APN not found' };
          setResults([...updated]);
          continue;
        }

        const match = allParcels.find(p => normalizeApn(p.apn) === apnNorm);

        if (!match) {
          updated[i] = { ...updated[i], status: 'no-match', apn: apnRaw };
          setResults([...updated]);
          continue;
        }

        if (match.folderPath) {
          await (window as any).electronAPI.copyFileToFolder({
            sourcePath: item.filePath,
            destFolder: match.folderPath + '\\Maps',
            fileName: `TaxMap_${match.apn}.pdf`,
          });
        }

        updated[i] = {
          ...updated[i],
          status: 'matched',
          apn: apnRaw,
          matchedParcel: match.apn,
        };
        setResults([...updated]);

      } catch (err: any) {
        updated[i] = { ...updated[i], status: 'error', error: err.message || 'Unknown error' };
        setResults([...updated]);
      }

      await new Promise(r => setTimeout(r, 800));
    }

    setRunning(false);
    setDone(true);
    onComplete();
  }

  const counts = {
    matched: results.filter(r => r.status === 'matched').length,
    noMatch: results.filter(r => r.status === 'no-match').length,
    error: results.filter(r => r.status === 'error').length,
    pending: results.filter(r => r.status === 'pending').length,
  };

  const statusColor = (s: FileResult['status']) => {
    if (s === 'matched') return '#86efac';
    if (s === 'no-match') return '#fbbf24';
    if (s === 'error') return '#f87171';
    if (s === 'processing') return '#60a5fa';
    return 'var(--text-muted)';
  };

  const statusLabel = (s: FileResult['status']) => {
    if (s === 'matched') return '✓ Matched & Copied';
    if (s === 'no-match') return '⚠ No Matching Parcel';
    if (s === 'error') return '✕ Error';
    if (s === 'processing') return '⟳ Processing...';
    return '— Pending';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 32, width: 680, maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
            🗺 Batch Property Card Importer
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            Select a folder of property card PDFs. Claude will read each one, extract the APN,
            and copy the file into the matching parcel's Maps folder automatically.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-secondary" onClick={handleSelectFolder} disabled={running}>
            📂 Select Folder of PDFs
          </button>
          {folderPath && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {folderPath} — {results.length} PDF{results.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
            <span style={{ color: 'var(--text-muted)' }}>Total: {results.length}</span>
            {counts.matched > 0 && <span style={{ color: '#86efac' }}>✓ {counts.matched} matched</span>}
            {counts.noMatch > 0 && <span style={{ color: '#fbbf24' }}>⚠ {counts.noMatch} unmatched</span>}
            {counts.error > 0 && <span style={{ color: '#f87171' }}>✕ {counts.error} errors</span>}
            {counts.pending > 0 && <span style={{ color: 'var(--text-muted)' }}>— {counts.pending} pending</span>}
          </div>
        )}

        {results.length > 0 && (
          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
            maxHeight: 380,
          }}>
            {results.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 200px',
                alignItems: 'center', gap: 12,
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--bg-tertiary)', fontSize: 13,
              }}>
                <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{r.fileName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.apn ? `APN: ${r.apn}` : ''}</div>
                <div style={{ color: statusColor(r.status), fontWeight: 600 }}>
                  {statusLabel(r.status)}
                  {r.error && <div style={{ fontSize: 11, fontWeight: 400, color: '#f87171' }}>{r.error}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {done && counts.noMatch > 0 && (
          <div style={{
            padding: '10px 14px', background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8,
            fontSize: 12, color: '#fbbf24',
          }}>
            ⚠ {counts.noMatch} file{counts.noMatch !== 1 ? 's' : ''} could not be matched.
            The APN from the property card didn't match any parcel in your CRM.
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {!done ? (
            <button
              className="btn-primary"
              onClick={handleRun}
              disabled={running || results.length === 0}
            >
              {running
                ? `Processing... (${counts.matched + counts.noMatch + counts.error}/${results.length})`
                : `▶ Run Import (${results.length} files)`}
            </button>
          ) : (
            <button className="btn-primary" onClick={onClose}>✓ Done</button>
          )}
          <button className="btn-secondary" onClick={onClose} disabled={running}>Cancel</button>
        </div>
      </div>
    </div>
  );
}