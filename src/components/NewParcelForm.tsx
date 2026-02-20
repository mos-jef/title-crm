import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Parcel, upsertParcel } from '../database';

interface Props {
  onBack: () => void;
  onSaved: (parcel: Parcel) => void;
}

export default function NewParcelForm({ onBack, onSaved }: Props) {
  const [form, setForm] = useState({
    apn: '',
    mapParcelNo: '',
    county: '',
    state: '',
    address: '',
    tractType: '',
    acres: '',
    assessedOwner: '',
    legalOwner: '',
    legalDescription: '',
    briefLegal: '',
    vestingDeedNo: '',
  });

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    const id = uuidv4();
    const now = new Date().toISOString();
    const parcel: Parcel = {
      id,
      ...form,
      completed: false,
      folderPath: '',
      createdAt: now,
      updatedAt: now,
    };

    if ((window as any).electronAPI) {
      const result = await (window as any).electronAPI.createParcelFolder({
        id,
        apn: form.apn
      });
      if (result.success) {
        parcel.folderPath = result.path;
      }
    }

    upsertParcel(parcel);
    onSaved(parcel);
  }

  return (
    <div className="detail-container">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="detail-card">
        <h2>New Parcel</h2>
        <div className="field-grid">
          <div className="field-group">
            <label className="field-label">APN</label>
            <input className="field-input" value={form.apn}
              onChange={e => handleChange('apn', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Map / Parcel No.</label>
            <input className="field-input" value={form.mapParcelNo}
              onChange={e => handleChange('mapParcelNo', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">County</label>
            <input className="field-input" value={form.county}
              onChange={e => handleChange('county', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">State</label>
            <input className="field-input" value={form.state}
              onChange={e => handleChange('state', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Address</label>
            <input className="field-input" value={form.address}
              onChange={e => handleChange('address', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Tract Type</label>
            <input className="field-input" value={form.tractType}
              onChange={e => handleChange('tractType', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Acres</label>
            <input className="field-input" value={form.acres}
              onChange={e => handleChange('acres', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Vesting Deed No.</label>
            <input className="field-input" value={form.vestingDeedNo}
              onChange={e => handleChange('vestingDeedNo', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Assessed Owner</label>
            <input className="field-input" value={form.assessedOwner}
              onChange={e => handleChange('assessedOwner', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Legal Owner</label>
            <input className="field-input" value={form.legalOwner}
              onChange={e => handleChange('legalOwner', e.target.value)} />
          </div>
        </div>
        <div className="field-grid single" style={{ marginTop: 16 }}>
          <div className="field-group">
            <label className="field-label">Brief Legal</label>
            <input className="field-input" value={form.briefLegal}
              onChange={e => handleChange('briefLegal', e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Legal Description</label>
            <textarea className="field-input textarea" value={form.legalDescription}
              onChange={e => handleChange('legalDescription', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-primary" onClick={handleSave}>Save Parcel</button>
        <button className="btn-secondary" onClick={onBack}>Cancel</button>
      </div>
    </div>
  );
}