'use client';

import React, { useState } from 'react';
import { BookOpen, AlertCircle } from 'lucide-react';

interface LandingPageProps {
  onSignIn: (accessToken: string, userInfo: any) => void;
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
  } | null;
}

export default function LandingPage({
  onSignIn,
  isLoading,
  loadingMessage,
  config,
}: LandingPageProps) {
  const [authError, setAuthError] = useState<string | null>(null);

  const clientId = config?.clientId || '';

  const handleGoogleSignIn = () => {
    setAuthError(null);

    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      setAuthError('Google sign-in is still loading. Please try again in a moment.');
      return;
    }

    if (!clientId) {
      setAuthError('Google sign-in is not configured. Contact your administrator.');
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        prompt: 'select_account',
        callback: async (response: any) => {
          if (response.error) {
            setAuthError(`Sign-in failed: ${response.error_description || response.error}`);
            return;
          }

          if (response.access_token) {
            try {
              const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const userData = await userRes.json();
              onSignIn(response.access_token, userData);
            } catch {
              onSignIn(response.access_token, { email: '', name: '' });
            }
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      setAuthError(err?.message || 'Failed to start Google sign-in.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200">
            {config?.programDisplayName || "Timedoor Academy"}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Holiday Camp Operational</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Sign in to find or set up your branch's recap sheet and issue certificates.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200 text-center space-y-2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-700">{loadingMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-stretch gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg text-sm border border-gray-300 transition-colors cursor-pointer"
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
                  title="Panduan"
                  aria-label="Panduan"
                  className="relative flex items-center justify-center w-12 h-12 flex-shrink-0 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <span className="absolute inset-0 rounded-lg bg-gray-900 animate-ping opacity-20" />
                  <BookOpen className="w-5 h-5 relative" />
                </a>
              </div>

              {authError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>{authError}</p>
                </div>
              )}
{/* 
              <p className="text-center text-xs text-gray-400 pt-1">
                Forces the account selector so you can choose the correct branch account.
              </p> */}
            </div>
          )}
        </div>

        <div className="text-center mt-6 text-xs text-gray-400">
          · Internal Branch Portal
        </div>
      </div>
    </div>
  );
}
