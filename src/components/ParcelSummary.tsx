import React from 'react';
import { Parcel } from '../database';

interface Props {
  parcel: Parcel;
  onClose: () => void;
}

export default function ParcelSummary({ parcel, onClose }: Props) {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print controls - hidden when printing */}
      <div className="summary-controls no-print">
        <button className="back-btn" onClick={onClose}>← Back</button>
        <button className="btn-primary" onClick={handlePrint}
          style={{ marginLeft: 12 }}>
          🖨 Print Summary
        </button>
      </div>

      {/* Summary Sheet */}
      <div className="summary-sheet">
        <div className="summary-title">Parcel Summary</div>

        <div className="summary-table">
          {[
            { label: 'State', value: parcel.state },
            { label: 'County', value: parcel.county },
            { label: 'APN', value: parcel.apn },
            { label: 'Map No.', value: parcel.mapParcelNo },
            { label: 'Owner', value: parcel.assessedOwner || parcel.legalOwner },
            { label: 'Vesting Deed No.', value: parcel.vestingDeedNo },
            { label: 'Acreage', value: parcel.acres },
            { label: 'Brief Legal', value: parcel.briefLegal },
          ].map(({ label, value }) => (
            <div className="summary-row" key={label}>
              <div className="summary-label">{label}:</div>
              <div className="summary-divider" />
              <div className="summary-value">{value || ''}</div>
            </div>
          ))}

          {/* Full Legal row header */}
          <div className="summary-row">
            <div className="summary-label">Full Legal:</div>
            <div className="summary-divider" />
            <div className="summary-value" />
          </div>
        </div>

        {/* Full Legal Description below the table */}
        {parcel.legalDescription && (
          <div className="summary-legal-text">
            {parcel.legalDescription}
          </div>
        )}
      </div>
    </>
  );
}