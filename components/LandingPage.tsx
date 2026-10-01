'use client';

import React, { useState } from 'react';
import { ExternalLink, BookOpen, ShieldCheck, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface LandingPageProps {
  onSignIn: (accessToken: string, userInfo: any, isDemo?: boolean) => void;
  isLoading: boolean;
  loadingMessage: string;
  config: {
    batchCode: string;
    programName: string;
    programDisplayName: string;
    folderName: string;
    searchPrefix: string;
    panduanUrl: string;
    clientId: string;
    status: {
      hasTemplateSheet: boolean;
      hasCertTemplate: boolean;
      hasMasterLog: boolean;
      hasServiceAccount: boolean;
    };
  } | null;
}

export default function LandingPage({
  onSignIn,
  isLoading,
  loadingMessage,
  config,
}: LandingPageProps) {
  const [customClientId, setCustomClientId] = useState('');
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const effectiveClientId =
    config?.clientId ||
    (typeof window !== 'undefined' ? sessionStorage.getItem('custom_google_client_id') || '' : '') ||
    customClientId;

  const handleGoogleSignIn = () => {
    setAuthError(null);

    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      setAuthError('Google Identity Services SDK is still loading. Please try again in a few moments.');
      return;
    }

    if (!effectiveClientId) {
      setShowConfigDrawer(true);
      setAuthError('Please provide a Google OAuth Client ID to connect with Google Drive and Sheets.');
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope:
          'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        prompt: 'select_account',
        callback: async (response: any) => {
          if (response.error) {
            setAuthError(`Authentication error: ${response.error_description || response.error}`);
            return;
          }

          if (response.access_token) {
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const userData = await userRes.json();
              onSignIn(response.access_token, userData, false);
            } catch (uErr) {
              console.warn('Could not fetch user profile, using fallback:', uErr);
              onSignIn(response.access_token, { email: 'branch-admin@google.com', name: 'Branch Admin' }, false);
            }
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      console.error('Sign-in initiation error:', err);
      setAuthError(err?.message || 'Failed to initiate Google sign-in.');
    }
  };

  const handleDemoSignIn = () => {
    onSignIn(
      'demo_token',
      {
        name: 'Jakarta Branch Admin',
        email: 'jakarta.admin@timedoor.net',
        picture: 'https://picsum.photos/seed/admin_avatar/100/100',
      },
      true
    );
  };

  const saveCustomClientId = () => {
    if (customClientId.trim()) {
      sessionStorage.setItem('custom_google_client_id', customClientId.trim());
      setShowConfigDrawer(false);
      setAuthError(null);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-950 text-slate-100 overflow-hidden selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl z-10">
        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-slate-900/90 text-indigo-400 border border-slate-800 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cycle {config?.batchCode || '2612'} • {config?.programDisplayName || "Holiday Camp Dec'26"}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              Holiday Camp
              <span className="block text-indigo-400 font-bold text-2xl sm:text-3xl mt-1">
                Certificate Manager
              </span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              Self-service recap spreadsheet synchronization and one-click bulk certificate generation for branch administrators.
            </p>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950/60 rounded-xl border border-indigo-900/40 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-medium text-slate-200">{loadingMessage}</p>
                <p className="text-xs text-slate-500">Searching your Google Drive and verifying recap records...</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                  <button
                    onClick={handleGoogleSignIn}
                    className="flex-1 inline-flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.99] cursor-pointer"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <a
                    href={config?.panduanUrl || 'https://support.google.com'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm transition-all duration-300 shadow-md hover:shadow-amber-500/20 active:scale-[0.98] ring-2 ring-amber-400/50 animate-pulse hover:animate-none cursor-pointer"
                    title="Buka panduan penggunaan (tab baru)"
                  >
                    <BookOpen className="w-4 h-4 text-slate-950" />
                    <span>Panduan</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </a>
                </div>

                {authError && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p>{authError}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center text-xs text-slate-500">
                  <p>
                    Forces the Google account selector so you can choose the correct branch account.
                    Drive searches are restricted strictly to files you own.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Drive & Service Account Integration</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {showConfigDrawer ? 'Hide setup' : 'View credentials setup'}
              </button>
            </div>

            {showConfigDrawer && (
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Google OAuth Client ID (Approach A)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789-xxxx.apps.googleusercontent.com"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={saveCustomClientId}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Configured Client ID: {effectiveClientId ? `${effectiveClientId.slice(0, 16)}...` : 'Not set in env'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                  <div>
                    <span className="text-slate-400">Template Sheet: </span>
                    <span className={config?.status.hasTemplateSheet ? 'text-emerald-400' : 'text-amber-400'}>
                      {config?.status.hasTemplateSheet ? 'Configured' : 'Needs ID in .env'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Slides Template: </span>
                    <span className={config?.status.hasCertTemplate ? 'text-emerald-400' : 'text-amber-400'}>
                      {config?.status.hasCertTemplate ? 'Configured' : 'Needs ID in .env'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Master Log Sheet: </span>
                    <span className={config?.status.hasMasterLog ? 'text-emerald-400' : 'text-amber-400'}>
                      {config?.status.hasMasterLog ? 'Configured' : 'Optional / in .env'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Service Account: </span>
                    <span className={config?.status.hasServiceAccount ? 'text-emerald-400' : 'text-amber-400'}>
                      {config?.status.hasServiceAccount ? 'Active (Audit Mode)' : 'Optional in .env'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Launch Demo Sandbox (Preview with Mock Data)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-500">
          Holiday Camp Operations • Internal Branch Self-Service Portal
        </div>
      </div>
    </div>
  );
}
