import React, { useState, useEffect } from 'react';
import { Parcel, initDatabase, loadParcelsFromFirestore } from './database';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import ParcelList from './components/ParcelList';
import ParcelDetail from './components/ParcelDetail';
import NewParcelForm from './components/NewParcelForm';
import LoginScreen from './components/LoginScreen';
import AdminView from './components/AdminView';
import { applyTheme, getSavedTheme, Theme } from './theme';

type View = 'list' | 'detail' | 'new' | 'admin';

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [view, setView] = useState<View>('list');
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [theme, setTheme] = useState<Theme>(getSavedTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // When user logs in, load their parcels from Firestore
  useEffect(() => {
    if (user) {
      initDatabase().then(() => loadParcelsFromFirestore());
    }
  }, [user]);

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-muted)',
      fontSize: 16,
    }}>
      Loading...
    </div>
  );

  if (!user) return <LoginScreen />;

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
        profile={profile}
        onAdmin={profile?.isAdmin ? () => setView('admin') : undefined}
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
        {view === 'admin' && profile?.isAdmin && (
          <AdminView />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}