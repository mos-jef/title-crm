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
  const [lastParcel, setLastParcel] = useState<Parcel | null>(null);
  const [theme, setTheme] = useState<Theme>(getSavedTheme());
  const [showBatchTax, setShowBatchTax] = useState(false);
  const [showBatchProp, setShowBatchProp] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { applyTheme(theme); }, [theme]);

  useEffect(() => {
    if (user) { initDatabase().then(() => loadParcelsFromFirestore()); }
  }, [user]);

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-muted)', fontSize: 16,
    }}>Loading...</div>
  );

  if (!user) return <LoginScreen />;

  function handleThemeChange(newTheme: Theme) { setTheme(newTheme); }

  function handleSelectParcel(parcel: Parcel) {
    if (selectedParcel) setLastParcel(selectedParcel);
    setSelectedParcel(parcel);
    setView('detail');
  }

  function handleNewParcel() { setView('new'); }

  function handleBack() { setSelectedParcel(null); setView('list'); }

  function handleParcelSaved(parcel: Parcel) {
    setSelectedParcel(parcel);
    setView('detail');
  }

  function handleRefresh() {
    loadParcelsFromFirestore().then(() => setRefreshKey(k => k + 1));
  }

  return (
    <div className="app-container">
      <Sidebar
        onNewParcel={handleNewParcel}
        onShowList={handleBack}
        onThemeChange={handleThemeChange}
        theme={theme}
        profile={profile}
        onAdmin={profile?.isAdmin ? () => setView('admin') : undefined}
        onBatchTax={() => { setView('list'); setShowBatchTax(true); }}
        onBatchPropCard={() => { setView('list'); setShowBatchProp(true); }}
        onRefresh={handleRefresh}
      />

      <main className="main-content">
        {view === 'list' && (
          <ParcelList
            key={refreshKey}
            onSelectParcel={handleSelectParcel}
            showBatchTax={showBatchTax}
            showBatchProp={showBatchProp}
            onCloseBatchTax={() => setShowBatchTax(false)}
            onCloseBatchProp={() => setShowBatchProp(false)}
          />
        )}

        {view === 'detail' && selectedParcel && (
          <ParcelDetail
            parcel={selectedParcel}
            onBack={handleBack}
            onForward={lastParcel ? () => {
              const temp = selectedParcel;
              setSelectedParcel(lastParcel);
              setLastParcel(temp);
              setView('detail');
            } : undefined}
          />
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