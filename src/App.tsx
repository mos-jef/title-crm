import React, { useState, useEffect } from 'react';
import { Parcel } from './database';
import Sidebar from './components/Sidebar';
import ParcelList from './components/ParcelList';
import ParcelDetail from './components/ParcelDetail';
import NewParcelForm from './components/NewParcelForm';
import { applyTheme, getSavedTheme, Theme } from './theme';

type View = 'list' | 'detail' | 'new';

export default function App() {
  const [view, setView] = useState<View>('list');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [theme, setTheme] = useState<Theme>(getSavedTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  function handleSelectParcel(parcel: Parcel) {
    setSelectedParcel(parcel);
    setView('detail');
  }

  function handleNewParcel() { setView('new'); }

  function handleBack() {
    setSelectedParcel(null);
    setView('list');
  }

  function handleParcelSaved(parcel: Parcel) {
    setSelectedParcel(parcel);
    setView('detail');
  }

  return (
    <div className="app-container">
      <Sidebar
        onNewParcel={handleNewParcel}
        onShowList={handleBack}
        onToggleTheme={toggleTheme}
        theme={theme}
      />
      <main className="main-content">
        {view === 'list' && (
          <ParcelList onSelectParcel={handleSelectParcel} />
        )}
        {view === 'detail' && selectedParcel && (
          <ParcelDetail parcel={selectedParcel} onBack={handleBack} />
        )}
        {view === 'new' && (
          <NewParcelForm onBack={handleBack} onSaved={handleParcelSaved} />
        )}
      </main>
    </div>
  );
}