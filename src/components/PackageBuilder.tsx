import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { useState } from 'react';
import { Parcel } from '../database';

interface Props {
  parcel: Parcel;
  files: Record<string, { name: string; path: string }[]>;
  onClose: () => void;
}

const ORDER = ['Taxes', 'Vesting Deed', 'Maps', 'Chain', 'Miscellaneous'];

export default function PackageBuilder({ parcel, files, onClose }: Props) {
  const [building, setBuilding] = useState(false);
  const [status, setStatus] = useState('');
  const [done, setDone] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  function sanitizeText(text: string): string {
    return text.replace(/[^\u0000-\u00FF]/g, '?');
  }

  async function handleBuild() {
    setBuilding(true);
    setStatus('Creating package...');
    setDone(false);

    try {
      const mergedPdf = await PDFDocument.create();

      // Add summary page
      setStatus('Adding summary sheet...');
      const summaryPage = mergedPdf.addPage([612, 792]);

      const titleFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      const bodyFont = await mergedPdf.embedFont(StandardFonts.Helvetica);

      summaryPage.drawText(sanitizeText('Parcel Summary'), {
          x: 180, y: 740, size: 24, font: titleFont,
          color: rgb(0.1, 0.22, 0.43),
        });

      const summaryRows: [string, string][] = [
        ['State:', sanitizeText(parcel.state || '')],
        ['County:', sanitizeText(parcel.county || '')],
        ['APN:', sanitizeText(parcel.apn || '')],
        ['Map No.:', sanitizeText(parcel.mapParcelNo || '')],
        ['Owner:', sanitizeText(parcel.assessedOwner || parcel.legalOwner || '')],
        ['Vesting Deed No.:', sanitizeText(parcel.vestingDeedNo || '')],
        ['Acreage:', sanitizeText(parcel.acres || '')],
        ['Brief Legal:', sanitizeText(parcel.briefLegal || '')],
      ];

      let y = 700;
      summaryRows.forEach(([label, value]) => {
        summaryPage.drawText(label, {
          x: 60, y, size: 12, font: titleFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        summaryPage.drawText(value, {
          x: 240, y, size: 11, font: bodyFont,
          color: rgb(0.1, 0.1, 0.1),
        });
        summaryPage.drawLine({
          start: { x: 60, y: y - 8 },
          end: { x: 550, y: y - 8 },
          thickness: 0.5,
          color: rgb(0.75, 0.78, 0.85),
        });
        y -= 36;
      });

      // Full Legal row — label bold on left, "See Appendix A" on right, ONE divider line below
      summaryPage.drawText('Full Legal:', {
        x: 60, y, size: 12, font: titleFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      summaryPage.drawText('See Appendix "A"', {
        x: 240, y, size: 11, font: bodyFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      summaryPage.drawLine({
        start: { x: 60, y: y - 8 },
        end: { x: 550, y: y - 8 },
        thickness: 0.5,
        color: rgb(0.75, 0.78, 0.85),
      });
      y -= 36;


      // Appendix A page for legal description
      if (parcel.legalDescription) {
        const appendixPage = mergedPdf.addPage([612, 792]);

        // Normalize legal description text — collapse extra whitespace and newlines
        const normalizedLegal = sanitizeText(
          parcel.legalDescription
            .replace(/\r\n|\r|\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        );

        // Header
        const headerFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
        appendixPage.drawText('Appendix A', {
          x: 240, y: 740, size: 13, font: headerFont,
          color: rgb(0.1, 0.1, 0.1),
        });

        // Draw legal text with proper word wrap using real font metrics
        const fontSize = 10;
        const lineHeight = 15;
        const maxWidth = 492; // 612 - 60 left - 60 right
        const leftMargin = 60;
        let currentPage = appendixPage;
        let currentY = 710;

        const words = normalizedLegal.split(' ');
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = bodyFont.widthOfTextAtSize(testLine, fontSize);

          if (testWidth > maxWidth && currentLine !== '') {
            // Draw current line
            currentPage.drawText(currentLine, {
              x: leftMargin, y: currentY, size: fontSize, font: bodyFont,
              color: rgb(0.1, 0.1, 0.1),
            });
            currentY -= lineHeight;
            currentLine = word;

            // New page if needed
            if (currentY < 60) {
              currentPage = mergedPdf.addPage([612, 792]);
              currentY = 740;
            }
          } else {
            currentLine = testLine;
          }
        }

        // Draw any remaining text
        if (currentLine.trim()) {
          currentPage.drawText(currentLine.trim(), {
            x: leftMargin, y: currentY, size: fontSize, font: bodyFont,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }

      // Add documents in order
      for (const category of ORDER) {
        const catFiles = files[category] || [];
        for (const file of catFiles) {
          setStatus(`Adding ${category}: ${file.name}...`);
          const result = await (window as any).electronAPI.readFileBase64(file.path);
          if (!result.success) continue;

          const bytes = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0));

          if (result.ext === '.pdf') {
            try {
              const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
              const pageIndices = srcPdf.getPageIndices();
              const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
              copiedPages.forEach((p: PDFPage) => mergedPdf.addPage(p));
            } catch (e) {
              console.error('Could not load PDF:', file.name, e);
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
            } catch (e) {
              console.error('Could not embed image:', file.name, e);
            }
          }
        }
      }

      setStatus('Saving package PDF...');
      const pdfBytes = await mergedPdf.save();

      const saveResult = await (window as any).electronAPI.savePackagePdf({
        folderPath: parcel.folderPath,
        apn: parcel.apn,
        pdfBytes: Array.from(pdfBytes),
      });

      if (saveResult.success) {
        setOutputPath(saveResult.path);
        setStatus('Package created successfully!');
        setDone(true);
      } else {
        setStatus('Error saving PDF: ' + saveResult.error);
      }
    } catch (err: any) {
      setStatus('Error building package: ' + err.message);
    }

    setBuilding(false);
  }

  async function handleOpen() {
    if (outputPath && (window as any).electronAPI) {
      await (window as any).electronAPI.openFile(outputPath);
    }
  }

  const totalFiles = ORDER.reduce((sum, cat) => sum + (files[cat]?.length || 0), 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 32, width: 520,
      }}>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
          📦 Build PDF Package
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          Assembles all documents into a single PDF in this order:
        </p>

        <div style={{ marginBottom: 20 }}>
          {['Summary Sheet', ...ORDER].map((cat, i) => {
            const count = cat === 'Summary Sheet' ? 1 : (files[cat]?.length || 0);
            return (
              <div key={cat} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 6, marginBottom: 4,
                background: count > 0 ? 'var(--bg-tertiary)' : 'transparent',
                opacity: count > 0 ? 1 : 0.4,
              }}>
                <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {i + 1}. {cat}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {cat === 'Summary Sheet' ? 'generated' : `${count} file${count !== 1 ? 's' : ''}`}
                </span>
              </div>
            );
          })}
        </div>

        {status && (
          <div style={{
            padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8,
            fontSize: 13, color: done ? '#86efac' : 'var(--text-secondary)',
            marginBottom: 16,
          }}>
            {status}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {!done ? (
            <button className="btn-primary" onClick={handleBuild} disabled={building}>
              {building ? 'Building...' : `📦 Build Package (${totalFiles + 1} pages)`}
            </button>
          ) : (
            <button className="btn-primary" onClick={handleOpen}>
              📄 Open Package PDF
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {done ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}