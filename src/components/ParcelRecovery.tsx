import { useState } from 'react';
import { upsertParcel, Parcel } from '../database';

interface Props {
  onClose: () => void;
}

interface FolderResult {
  folderName: string;
  folderPath: string;
  status: 'pending' | 'scanning' | 'done' | 'error';
  apn?: string;
  filesFound?: string[];
  error?: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function extractFromPdf(base64: string, category: string): Promise<any> {
  const apiKey = await (window as any).electronAPI.getClaudeApiKey();

  const categoryPrompts: Record<string, string> = {
    'Taxes': `This is a county tax card or assessor document. Extract ALL available fields.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "apn": "parcel number digits only no dashes",
  "apnRaw": "parcel number exactly as printed",
  "assessedOwner": "owner name",
  "legalOwner": "owner name",
  "county": "county name only",
  "state": "two-letter state abbreviation",
  "acres": "acreage as plain number",
  "briefLegal": "short legal description",
  "legalDescription": "full legal description",
  "mapParcelNo": "map or alternate ID",
  "address": "property address"
}`,
    'Vesting Deed': `This is a vesting deed or deed document. Extract ALL available fields.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "legalOwner": "grantee/buyer name",
  "assessedOwner": "grantee/buyer name",
  "vestingDeedNo": "deed number, instrument number, or document number",
  "legalDescription": "full legal description of the property",
  "briefLegal": "short legal description or section/township/range",
  "acres": "acreage if mentioned",
  "county": "county name",
  "state": "two-letter state abbreviation",
  "address": "property address if mentioned"
}`,
    'Chain': `This is a chain of title document. Extract ALL available fields.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "legalOwner": "current owner name",
  "legalDescription": "full legal description",
  "briefLegal": "short legal description",
  "county": "county name",
  "state": "two-letter state abbreviation",
  "acres": "acreage if mentioned"
}`,
    'Maps': `This is a property map or plat document. Extract ALL available fields.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "mapParcelNo": "map number, parcel number, or plat reference",
  "briefLegal": "legal description or subdivision name",
  "legalDescription": "full legal description if present",
  "acres": "acreage if shown",
  "county": "county name",
  "state": "two-letter state abbreviation"
}`,
    'Easements': `This is an easement document. Extract ALL available fields.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "legalDescription": "full legal description of easement area",
  "briefLegal": "short description of easement",
  "county": "county name",
  "state": "two-letter state abbreviation"
}`,
    'Miscellaneous': `This is a miscellaneous real estate document. Extract any relevant parcel information.
Return ONLY a valid JSON object with these keys (use empty string if not found):
{
  "apn": "parcel number if present",
  "legalOwner": "owner name if present",
  "legalDescription": "legal description if present",
  "briefLegal": "short legal description if present",
  "acres": "acreage if present",
  "county": "county name if present",
  "state": "two-letter state abbreviation if present",
  "address": "address if present"
}`,
  };

  const prompt = categoryPrompts[category] || categoryPrompts['Miscellaneous'];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function mergeExtracted(base: Partial<Parcel>, incoming: any, priority: 'base' | 'incoming'): Partial<Parcel> {
  if (!incoming) return base;
  const result = { ...base };
  const fields: (keyof Parcel)[] = [
    'apn', 'assessedOwner', 'legalOwner', 'county', 'state',
    'acres', 'briefLegal', 'legalDescription', 'mapParcelNo',
    'address', 'vestingDeedNo',
  ];
  for (const f of fields) {
    const incomingVal = incoming[f] || '';
    const baseVal = (base as any)[f] || '';
    if (priority === 'incoming') {
      (result as any)[f] = incomingVal || baseVal;
    } else {
      (result as any)[f] = baseVal || incomingVal;
    }
  }
  // Always prefer longer legal description
  if (incoming.legalDescription && incoming.legalDescription.length > (result.legalDescription || '').length) {
    result.legalDescription = incoming.legalDescription;
  }
  return result;
}

const CATEGORIES = ['Taxes', 'Vesting Deed', 'Chain', 'Maps', 'Easements', 'Miscellaneous'];

export default function ParcelRecovery({ onClose }: Props) {
  const [results, setResults] = useState<FolderResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [basePath, setBasePath] = useState('');

  async function handleScan() {
    const picked = await (window as any).electronAPI.pickFolder();
    if (!picked.success) return;

    const result = await (window as any).electronAPI.scanParcelsDirectory(picked.folderPath);
    if (!result.success || result.folders.length === 0) {
      alert('No parcel folders found in that directory.');
      return;
    }
    setBasePath(result.basePath);
    setResults(result.folders.map((f: any) => ({
      folderName: f.name,
      folderPath: f.path,
      status: 'pending',
      filesFound: f.files,
    })));
    setScanned(true);
  }

  async function handleRecover() {
    if (results.length === 0) return;
    setRunning(true);
    setDone(false);

    const updated = [...results];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: 'scanning' };
      setResults([...updated]);

      const folder = updated[i];

      try {
        let extracted: Partial<Parcel> = {};

        // Process each category — Tax card first (highest priority for APN/owner/acres)
        // Then Vesting Deed (for vestingDeedNo and legalDescription)
        // Then others for supplemental data
        const categoryOrder = ['Taxes', 'Vesting Deed', 'Chain', 'Maps', 'Easements', 'Miscellaneous'];

        for (const category of categoryOrder) {
          const catPath = folder.folderPath + '\\' + category;
          const catFiles = await (window as any).electronAPI.listFilesInFolder(catPath);
          if (!catFiles.success || catFiles.files.length === 0) continue;

          for (const file of catFiles.files) {
            if (!file.name.toLowerCase().endsWith('.pdf')) continue;

            try {
              const readResult = await (window as any).electronAPI.readPdfBase64(file.path);
              if (!readResult.success) continue;

              const fileExtracted = await extractFromPdf(readResult.base64, category);
              if (!fileExtracted) continue;

              // Tax card and vesting deed take priority for their key fields
              const priority = (category === 'Taxes' || category === 'Vesting Deed')
                ? 'incoming'
                : 'base';

              extracted = mergeExtracted(extracted, fileExtracted, priority);

              await new Promise(r => setTimeout(r, 25000));
            } catch (e) {
              console.warn(`Error reading ${file.name}:`, e);
            }
          }
        }

        // Use folder name as APN fallback
        const apn = (extracted.apn || folder.folderName).trim();

        const newParcel: Parcel = {
          id: generateId(),
          apn,
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
          vestingDeedNo: extracted.vestingDeedNo || '',
          completed: false,
          folderPath: folder.folderPath,
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await upsertParcel(newParcel);

        updated[i] = {
          ...updated[i],
          status: 'done',
          apn,
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
    }

    setRunning(false);
    setDone(true);
  }

  const counts = {
    pending: results.filter(r => r.status === 'pending').length,
    done: results.filter(r => r.status === 'done').length,
    error: results.filter(r => r.status === 'error').length,
  };

  const statusColor = (s: FolderResult['status']) => {
    if (s === 'done') return '#86efac';
    if (s === 'error') return '#f87171';
    if (s === 'scanning') return '#60a5fa';
    return 'var(--text-muted)';
  };

  const statusLabel = (s: FolderResult['status'], apn?: string) => {
    if (s === 'done') return `✓ Recovered${apn ? ` — APN: ${apn}` : ''}`;
    if (s === 'error') return '✕ Error';
    if (s === 'scanning') return '⟳ Reading documents...';
    return '— Pending';
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 32, width: 720, maxHeight: '88vh',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
            🔄 Parcel Recovery Tool
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
            Scans every folder in your Parcels directory, reads all PDFs in all subfolders
            using Claude, and rebuilds your parcel records in the CRM. Existing folders
            and files are never moved or modified.
          </p>
        </div>

        {!scanned ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: '12px 16px',
              background: 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 8, fontSize: 13, color: '#a78bfa',
            }}>
              📁 Will scan: <strong>Documents\TitleCRM\Parcels</strong><br />
              Every PDF in every subfolder (Taxes, Vesting Deed, Chain, Maps, Easements, Miscellaneous)
              will be read and all data extracted automatically.
            </div>
            <button className="btn-primary" onClick={handleScan} style={{ alignSelf: 'flex-start' }}>
              📂 Scan Parcels Directory
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Found <strong style={{ color: 'var(--text-primary)' }}>{results.length}</strong> parcel folders in {basePath}
            </div>

            {results.length > 0 && (
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                {counts.done > 0 && <span style={{ color: '#86efac' }}>✓ {counts.done} recovered</span>}
                {counts.error > 0 && <span style={{ color: '#f87171' }}>✕ {counts.error} errors</span>}
                {counts.pending > 0 && <span style={{ color: 'var(--text-muted)' }}>— {counts.pending} pending</span>}
              </div>
            )}

            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
              maxHeight: 400,
            }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '200px 1fr',
                  alignItems: 'center', gap: 12,
                  padding: '8px 12px', borderRadius: 6,
                  background: 'var(--bg-tertiary)', fontSize: 13,
                }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {r.folderName}
                  </div>
                  <div style={{ color: statusColor(r.status), fontWeight: 500 }}>
                    {statusLabel(r.status, r.apn)}
                    {r.error && (
                      <div style={{ fontSize: 11, color: '#f87171', fontWeight: 400 }}>{r.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {done && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(134,239,172,0.1)',
                border: '1px solid rgba(134,239,172,0.3)',
                borderRadius: 8, fontSize: 13, color: '#86efac',
              }}>
                ✓ Recovery complete. {counts.done} parcel{counts.done !== 1 ? 's' : ''} restored.
                Close this window and click All Parcels to see your recovered records.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              {!done ? (
                <button
                  className="btn-primary"
                  onClick={handleRecover}
                  disabled={running || results.length === 0}
                >
                  {running
                    ? `Recovering... (${counts.done + counts.error}/${results.length})`
                    : `▶ Recover All ${results.length} Parcels`}
                </button>
              ) : (
                <button className="btn-primary" onClick={onClose}>✓ Done</button>
              )}
              <button className="btn-secondary" onClick={onClose} disabled={running}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}