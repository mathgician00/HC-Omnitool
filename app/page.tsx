'use client';

import React, { useState, useEffect } from 'react';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [config, setConfig] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Resolution state (Find-or-create)
  const [isResolving, setIsResolving] = useState(false);
  const [resolvingMessage, setResolvingMessage] = useState('');
  const [recapSheet, setRecapSheet] = useState<any>(null);
  const [programFolder, setProgramFolder] = useState<any>(null);

  // Fetch public config on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load app config:', err));
  }, []);

  // Run find-or-create immediately after sign-in
  const runFindOrCreate = async (token: string, userInfo: any, isDemoMode = false) => {
    setIsResolving(true);
    setResolvingMessage('Connecting to Google Drive...');

    if (isDemoMode) {
      setTimeout(() => {
        setProgramFolder({
          id: 'demo_folder_123',
          name: config?.programDisplayName || "Holiday Camp Dec'26",
        });
        setRecapSheet({
          id: 'demo_sheet_456',
          name: `${config?.searchPrefix || '2612Holiday Camp @'}Jakarta`,
          webViewLink: 'https://docs.google.com/spreadsheets/d/demo_sheet_456',
          isNew: false,
        });
        setIsResolving(false);
      }, 700);
      return;
    }

    try {
      setResolvingMessage(
        `Searching Drive for '${config?.programDisplayName || "Holiday Camp Dec'26"}' folder...`
      );

      const res = await fetch('/api/recap/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: userInfo?.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to locate or duplicate recap sheet');
      }

      setProgramFolder(data.folder);
      setRecapSheet(data.recapSheet);
    } catch (err: any) {
      console.error('Find-or-create error:', err);
      alert(`Could not resolve recap spreadsheet: ${err?.message || err}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleSignIn = (token: string, userInfo: any, demo = false) => {
    setAccessToken(token);
    setUser(userInfo);
    setIsDemo(demo);
    runFindOrCreate(token, userInfo, demo);
  };

  const handleReset = () => {
    if (!accessToken) return;
    setRecapSheet(null);
    setProgramFolder(null);
    runFindOrCreate(accessToken, user, isDemo);
  };

  const handleSignOut = () => {
    setAccessToken(null);
    setUser(null);
    setIsDemo(false);
    setRecapSheet(null);
    setProgramFolder(null);
  };

  // Screen 2: Dashboard (when authenticated and recapSheet is resolved)
  if (accessToken && recapSheet && programFolder) {
    return (
      <Dashboard
        accessToken={accessToken}
        user={user || {}}
        recapSheet={recapSheet}
        programFolder={programFolder}
        programInfo={{
          batchCode: config?.batchCode || '2612',
          programName: config?.programName || 'Holiday Camp',
          programDisplayName: config?.programDisplayName || "Holiday Camp Dec'26",
        }}
        isDemo={isDemo}
        onReset={handleReset}
        onSignOut={handleSignOut}
      />
    );
  }

  // Screen 1: Landing Page
  return (
    <LandingPage
      onSignIn={handleSignIn}
      isLoading={isResolving}
      loadingMessage={resolvingMessage}
      config={config}
    />
  );
}
