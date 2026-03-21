import { PDFDocument, PDFPage } from 'pdf-lib';
import { useState, useEffect, useCallback } from 'react';
import { Parcel } from '../database';

interface Props {
  parcel: Parcel;
  files: Record<string, { name: string; path: string }[]>;
  onClose: () => void;
}

interface PackageItem {
  name: string;
  path: string;
  category: string;
  checked: boolean;
  dateFound?: string;
}

function classifyFile(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.docx') && lower.includes('vcl')) return 'coversheet';
  if (lower.includes('_tc.') || lower.endsWith('_tc.pdf')) return 'tax_card';
  if (lower.includes('_tm.') || lower.endsWith('_tm.pdf')) return 'tax_map';
  if (lower.includes('tract_map') || lower.includes('tract map')) return 'parcel_map';
  if (lower.includes('deedplot') || lower.includes('deed_plot') || lower.includes('deed plot')) {
    return lower.endsWith('.pdf') ? 'deed_plot' : 'skip';
  }
  if (lower.includes('plat') || lower.includes('survey')) {
    return lower.endsWith('.pdf') ? 'plat_survey' : 'skip';
  }
  if (lower.endsWith('.mabf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'skip';
  }
  if (lower.endsWith('.pdf')) return 'deed';
  return 'skip';
}

const CATEGORY_ORDER: Record<string, number> = {
  'coversheet': 0,
  'tax_card': 1,
  'tax_map': 2,
  'parcel_map': 3,
  'deed_plot': 4,
  'plat_survey': 5,
  'deed': 6,
};

const CATEGORY_LABELS: Record<string, string> = {
  'coversheet': 'Cover Sheet',
  'tax_card': 'Tax Card',
  'tax_map': 'Tax Map',
  'parcel_map': 'Parcel Map',
  'deed_plot': 'Deed Plot',
  'plat_survey': 'Plat / Survey',
  'deed': 'Deed',
};

export default function PackageBuilder({ parcel, files, onClose }: Props) {
  const [items, setItems] = useState<PackageItem[]>([]);
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  // Auto-detect and classify files from all categories
  useEffect(() => {
    const allFiles: PackageItem[] = [];
    const categories = Object.keys(files);

    for (const cat of categories) {
      const catFiles = files[cat] || [];
      for (const f of catFiles) {
        const classification = classifyFile(f.name);
        if (classification === 'skip') continue;
        // Skip docx coversheets from the PDF package
        if (classification === 'coversheet') continue;
        allFiles.push({
          name: f.name,
          path: f.path,
          category: classification,
          checked: true,
        });
      }
    }

    // Sort by category order, then by name within category
    allFiles.sort((a, b) => {
      const orderA = CATEGORY_ORDER[a.category] ?? 99;
      const orderB = CATEGORY_ORDER[b.category] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      // For deeds, try to sort by any year found in filename (newest first)
      if (a.category === 'deed' && b.category === 'deed') {
        const yearA = extractYearFromName(a.name);
        const yearB = extractYearFromName(b.name);
        if (yearA && yearB) return yearB - yearA;
      }
      return a.name.localeCompare(b.name);
    });

    setItems(allFiles);
  }, [files]);

  function extractYearFromName(name: string): number | null {
    // Try to find a 4-digit year in the filename
    const matches = name.match(/\b(19|20)\d{2}\b/g);
    if (matches && matches.length > 0) {
      return Math.max(...matches.map(Number));
    }
    return null;
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, checked: !item.checked } : item
    ));
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    setItems(prev => {
      const arr = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function handleAddFile() {
    if (!(window as any).electronAPI) return;
    const result = await (window as any).electronAPI.pickPdfFile();
    if (!result || !result.success || !result.filePath) return;
    const name = result.filePath.split(/[\\/]/).pop() || 'unknown.pdf';
    setItems(prev => [...prev, {
      name,
      path: result.filePath,
      category: 'deed',
      checked: true,
    }]);
  }

  async function handleGenerate() {
    const checkedItems = items.filter(i => i.checked);
    if (checkedItems.length === 0) {
      setStatus('No files selected');
      return;
    }

    setBuilding(true);
    setDone(false);
    setStatus('Building package...');

    try {
      const mergedPdf = await PDFDocument.create();
      let pageCount = 0;

      for (const item of checkedItems) {
        setStatus(`Adding: ${item.name}...`);
        const result = await (window as any).electronAPI.readFileBase64(item.path);
        if (!result.success) {
          setStatus(`Warning: Could not read ${item.name}`);
          continue;
        }

        const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));

        if (result.ext === '.pdf') {
          try {
            const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const pageIndices = srcPdf.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
            copiedPages.forEach((p: PDFPage) => mergedPdf.addPage(p));
            pageCount += pageIndices.length;
          } catch (e) {
            console.error('Could not load PDF:', item.name, e);
          }
        } else if (['.png', '.jpg', '.jpeg'].includes(result.ext)) {
          try {
            const img = result.ext === '.png'
              ? await mergedPdf.embedPng(bytes)
              : await mergedPdf.embedJpg(bytes);
            const imgPage = mergedPdf.addPage([612, 792]);
            const scaled = img.scaleToFit(532, 712);
            imgPage.drawImage(img, {
              x: (612 - scaled.width) / 2,
              y: (792 - scaled.height) / 2,
              width: scaled.width,
              height: scaled.height,
            });
            pageCount++;
          } catch (e) {
            console.error('Could not embed image:', item.name, e);
          }
        }
      }

      setStatus('Saving package...');
      const pdfBytes = await mergedPdf.save();

      const saveResult = await (window as any).electronAPI.savePackagePdf({
        folderPath: parcel.folderPath,
        apn: parcel.apn,
        pdfBytes: Array.from(pdfBytes),
      });

      if (saveResult.success) {
        setOutputPath(saveResult.path);
        setStatus(`Package created: ${pageCount} pages`);
        setDone(true);
      } else {
        setStatus('Error saving: ' + saveResult.error);
      }
    } catch (err: any) {
      setStatus('Error: ' + err.message);
    }

    setBuilding(false);
  }

  async function handleOpen() {
    if (outputPath && (window as any).electronAPI) {
      await (window as any).electronAPI.openFile(outputPath);
    }
  }

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        width: 560,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
          }}>
            Package
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: 22,
            cursor: 'pointer', lineHeight: 1,
          }}>
            ✕
          </button>
        </div>

        {/* File list - scrollable */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {items.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>
              No PDF files found in this parcel's folders.
            </div>
          ) : (
            items.map((item, index) => (
              <div key={`${item.path}-${index}`} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                {/* Checkbox */}
                <div
                  onClick={() => toggleItem(index)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: '2px solid var(--border)',
                    background: item.checked ? 'var(--accent-primary)' : 'transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  {item.checked && (
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
                  )}
                </div>

                {/* File name + category badge */}
                <div style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: item.checked ? 'var(--bg-tertiary)' : 'var(--bg-input)',
                  opacity: item.checked ? 1 : 0.5,
                  transition: 'all 0.15s',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {item.name}
                  </div>
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginTop: 2,
                  }}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </div>
                </div>

                {/* Move buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      cursor: index === 0 ? 'default' : 'pointer',
                      opacity: index === 0 ? 0.2 : 0.7,
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      cursor: index === items.length - 1 ? 'default' : 'pointer',
                      opacity: index === items.length - 1 ? 0.2 : 0.7,
                      color: 'var(--text-secondary)',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          {/* Status message */}
          {status && (
            <div style={{
              padding: '8px 12px',
              background: done ? 'rgba(134,239,172,0.1)' : 'var(--bg-tertiary)',
              borderRadius: 8,
              fontSize: 13,
              color: done ? '#86efac' : 'var(--text-secondary)',
            }}>
              {status}
            </div>
          )}

          {/* Buttons row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleAddFile}
              disabled={building}
              style={{
                background: 'var(--accent-yellow, #ffd866)',
                color: '#0d0c0c',
                border: '1px solid var(--border)',
                borderRadius: 20,
                padding: '8px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: building ? 'default' : 'pointer',
                opacity: building ? 0.5 : 1,
              }}
            >
              Add+
            </button>

            <div style={{ flex: 1 }} />

            {!done ? (
              <button
                onClick={handleGenerate}
                disabled={building || checkedCount === 0}
                style={{
                  background: 'var(--accent-red, #f85255)',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '12px 28px',
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: (building || checkedCount === 0) ? 'default' : 'pointer',
                  opacity: (building || checkedCount === 0) ? 0.5 : 1,
                  letterSpacing: 0.5,
                }}
              >
                {building ? 'Building...' : `GENERATE (${checkedCount})`}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary" onClick={handleOpen}
                  style={{ borderRadius: 20, padding: '12px 24px' }}>
                  Open Package
                </button>
                <button className="btn-secondary" onClick={onClose}
                  style={{ borderRadius: 20, padding: '12px 24px' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}