import React, { useState } from 'react';
import { Parcel } from '../database';

interface Props {
  parcel: Parcel;
  onFieldsExtracted: (fields: Partial<Parcel>) => void;
  onClose: () => void;
}

export default function TaxCardReader({ parcel, onFieldsExtracted, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<Partial<Parcel> | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');

  async function handleSelectTaxCard() {
    setLoading(true);
    setStatus('Opening file picker...');
    setPreview(null);

    try {
      const picked = await (window as any).electronAPI.pickPdfFile();
      if (!picked.success) {
        setStatus('');
        setLoading(false);
        return;
      }

      setSelectedFilePath(picked.filePath);
      setSelectedFileName(picked.fileName);
      setStatus('Reading tax card...');

      const result = await (window as any).electronAPI.readPdfBase64(picked.filePath);
      if (!result.success) {
        setStatus('Failed to read file: ' + (result.error || 'unknown error'));
        setLoading(false);
        return;
      }

      setStatus('Sending to Claude for extraction...');

      const extracted = await (window as any).electronAPI.claudeExtractTaxCard({
        base64: result.base64,
      });

      if (!extracted.success) {
        setStatus('Claude API error: ' + (extracted.error || 'unknown error'));
        setLoading(false);
        return;
      }

      setPreview(extracted.extracted);
      setStatus('Review the extracted fields below.');
    } catch (err: any) {
      setStatus('Error: ' + (err.message || 'unknown error'));
    }

    setLoading(false);
  }

  async function handleApply() {
    if (!preview) return;

    // Copy the tax card PDF into the parcel's Taxes folder
    if (selectedFilePath && parcel.folderPath) {
      try {
        const taxFolder = parcel.folderPath + '\\Taxes';
        await (window as any).electronAPI.copyFileToFolder({
          sourcePath: selectedFilePath,
          destFolder: taxFolder,
          fileName: selectedFileName,
        });
      } catch (e) {
        // Non-fatal — still apply the fields even if copy fails
        console.warn('Could not copy tax card to folder:', e);
      }
    }

    onFieldsExtracted(preview);
    onClose();
  }

  const fieldLabels: Record<string, string> = {
    apn: 'APN',
    assessedOwner: 'Assessed Owner',
    legalOwner: 'Legal Owner',
    county: 'County',
    state: 'State',
    acres: 'Acres',
    briefLegal: 'Brief Legal',
    legalDescription: 'Legal Description',
    mapParcelNo: 'Map / Parcel No.',
    address: 'Address',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 32, width: 600, maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
          🧾 Tax Card Reader
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
          Select a county tax card PDF. Claude will extract all parcel fields and
          the file will be copied into this parcel's Taxes folder automatically.
        </p>

        <button className="btn-primary" onClick={handleSelectTaxCard} disabled={loading}>
          {loading ? 'Processing...' : '📂 Select Tax Card PDF'}
        </button>

        {status && (
          <div style={{
            marginTop: 16, padding: 12, background: 'var(--bg-tertiary)',
            borderRadius: 8, fontSize: 13,
            color: status.startsWith('Error') || status.startsWith('Failed') || status.startsWith('Claude')
              ? '#f87171' : 'var(--text-secondary)',
          }}>
            {status}
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Extracted Fields — Review Before Applying
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(preview).map(([key, value]) =>
                value ? (
                  <div key={key} style={{
                    display: 'grid', gridTemplateColumns: '160px 1fr',
                    gap: 12, padding: '8px 12px',
                    background: 'var(--bg-tertiary)', borderRadius: 6,
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {fieldLabels[key] || key}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                      {String(value)}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button className="btn-primary" onClick={handleApply}>
                ✓ Apply to Parcel
              </button>
              <button className="btn-secondary" onClick={() => {
                setPreview(null);
                setStatus('');
                setSelectedFilePath('');
                setSelectedFileName('');
              }}>
                Try Again
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}