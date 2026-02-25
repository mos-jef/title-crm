import { useState } from 'react';
import { loadParcelsFromFirestore, Parcel, upsertParcel } from '../database';

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

interface FileResult {
  fileName: string;
  status: 'pending' | 'processing' | 'matched' | 'no-match' | 'created' | 'error';
  apn?: string;
  matchedParcel?: string;
  error?: string;
  extracted?: Partial<Parcel>;
}

async function extractFromPdf(base64: string): Promise<any> {
  const result = await (window as any).electronAPI.claudeExtractTaxCard({ base64 });
  if (!result.success) throw new Error(result.error || 'Extraction failed');
  return result.extracted;
}

function normalizeApn(raw: string): string {
  return (raw || '').replace(/[\s\-.]/g, '').toLowerCase();
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function BatchTaxImporter({ onClose, onComplete }: Props) {
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
      const item = updated[i] as any;

      updated[i] = { ...updated[i], status: 'processing' };
      setResults([...updated]);

      try {
        const readResult = await (window as any).electronAPI.readPdfBase64(item.filePath);
        if (!readResult.success) {
          updated[i] = { ...updated[i], status: 'error', error: 'Could not read file' };
          setResults([...updated]);
          continue;
        }

        const extractedRaw = await extractFromPdf(readResult.base64) as any;
        const extracted: Partial<Parcel> = extractedRaw;
        const apnRaw: string = extractedRaw.apnRaw || extracted.apn || '';
        const apnNorm = normalizeApn(extracted.apn || '');

        if (!apnNorm) {
          updated[i] = {
            ...updated[i],
            status: 'error',
            error: 'Could not extract APN from PDF',
          };
          setResults([...updated]);
          continue;
        }

        let match = allParcels.find(p => normalizeApn(p.apn) === apnNorm);

        // ── AUTO-CREATE if no match ──────────────────────────────────────────
        if (!match) {
          const newId = generateId();
          const apnClean = extracted.apn || apnRaw;

          // Create the folder structure on disk
          let newFolderPath = '';

          try {
            const folderResult = await (window as any).electronAPI.createParcelFolder({
              id: newId,
              apn: apnClean,
            });
            console.log('createParcelFolder result:', JSON.stringify(folderResult));
            if (folderResult?.success) {
              newFolderPath = folderResult.path;
            }
          } catch (e) {
            console.warn('Could not create folder for new parcel:', e);
          }

          const newParcel: Parcel = {
            id: newId,
            apn: apnClean,
            mapParcelNo: extracted.mapParcelNo || '',
            county: extracted.county || '',
            state: extracted.state || '',
            address: extracted.address || '',
            assessedOwner: extracted.assessedOwner || '',
            legalOwner: extracted.legalOwner || '',
            legalDescription: extracted.legalDescription || '',
            briefLegal: extracted.briefLegal || '',
            tractType: '',
            acres: extracted.acres || '',
            vestingDeedNo: '',
            completed: false,
            folderPath: newFolderPath,
            notes: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await upsertParcel(newParcel);
          allParcels.push(newParcel);
          match = newParcel;

          // Copy tax card into new parcel's Taxes folder
          if (newFolderPath) {
            try {
              await (window as any).electronAPI.copyFileToFolder({
                sourcePath: item.filePath,
                destFolder: newFolderPath + '\\Taxes',
                fileName: `TaxCard_${apnClean}.pdf`,
              });
            } catch (e) {
              console.warn('Could not copy tax card to new parcel folder:', e);
            }
          }

          updated[i] = {
            ...updated[i],
            status: 'created',
            apn: apnRaw,
            matchedParcel: apnClean,
            extracted,
          };
          setResults([...updated]);

          await new Promise(r => setTimeout(r, 800));
          continue;
        }

        // ── EXISTING MATCH — update fields ───────────────────────────────────
        const updatedParcel: Parcel = {
          ...match,
          assessedOwner: extracted.assessedOwner || match.assessedOwner,
          legalOwner: extracted.legalOwner || match.legalOwner,
          acres: extracted.acres || match.acres,
          briefLegal: extracted.briefLegal || match.briefLegal,
          legalDescription: extracted.legalDescription || match.legalDescription,
          mapParcelNo: extracted.mapParcelNo || match.mapParcelNo,
          address: extracted.address || match.address,
          county: extracted.county || match.county,
          state: extracted.state || match.state,
          updatedAt: new Date().toISOString(),
        };
        await upsertParcel(updatedParcel);

        if (match.folderPath) {
          try {
            await (window as any).electronAPI.copyFileToFolder({
              sourcePath: item.filePath,
              destFolder: match.folderPath + '\\Taxes',
              fileName: `TaxCard_${match.apn}.pdf`,
            });
          } catch (e) {
            console.warn('Could not copy tax card file:', e);
          }
        }

        updated[i] = {
          ...updated[i],
          status: 'matched',
          apn: apnRaw || extracted.apn || '',
          matchedParcel: match.apn,
          extracted,
        };
        setResults([...updated]);

      } catch (err: any) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          error: err.message || 'Unknown error',
        };
        setResults([...updated]);
      }

      await new Promise(r => setTimeout(r, 800));
    }

    setRunning(false);
    setDone(true);
    onComplete();
  }

  const counts = {
    pending: results.filter(r => r.status === 'pending').length,
    matched: results.filter(r => r.status === 'matched').length,
    created: results.filter(r => r.status === 'created').length,
    noMatch: results.filter(r => r.status === 'no-match').length,
    error: results.filter(r => r.status === 'error').length,
  };

  const statusColor = (s: FileResult['status']) => {
    if (s === 'matched') return '#86efac';
    if (s === 'created') return '#a78bfa';
    if (s === 'no-match') return '#fbbf24';
    if (s === 'error') return '#f87171';
    if (s === 'processing') return '#60a5fa';
    return 'var(--text-muted)';
  };

  const statusLabel = (s: FileResult['status']) => {
    if (s === 'matched') return '✓ Matched & Updated';
    if (s === 'created') return '✦ New Parcel Created';
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
            📥 Batch Tax Card Importer
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            Select a folder of tax card PDFs. Claude will read each one, extract the APN and all
            parcel fields, then update existing parcels or create new ones automatically.
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
            {counts.created > 0 && <span style={{ color: '#a78bfa' }}>✦ {counts.created} created</span>}
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
                background: 'var(--bg-tertiary)',
                fontSize: 13,
              }}>
                <div style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {r.fileName}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {r.apn ? `APN: ${r.apn}` : ''}
                </div>
                <div style={{ color: statusColor(r.status), fontWeight: 600 }}>
                  {statusLabel(r.status)}
                  {r.error && (
                    <div style={{ fontSize: 11, fontWeight: 400, color: '#f87171' }}>{r.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {done && counts.error > 0 && (
          <div style={{
            padding: '10px 14px', background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8,
            fontSize: 12, color: '#f87171',
          }}>
            ✕ {counts.error} file{counts.error !== 1 ? 's' : ''} encountered errors during processing.
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
                ? `Processing... (${counts.matched + counts.created + counts.noMatch + counts.error}/${results.length})`
                : `▶ Run Import (${results.length} files)`}
            </button>
          ) : (
            <button className="btn-primary" onClick={onClose}>
              ✓ Done
            </button>
          )}
          <button className="btn-secondary" onClick={onClose} disabled={running}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}