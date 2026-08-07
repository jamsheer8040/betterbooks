// app-params.js — Stripped of all Base44 references.
// No longer reads tokens from URL or localStorage.

export const appParams = {
  appId: 'filingsx-local',
  token: null,
  fromUrl: typeof window !== 'undefined' ? window.location.href : '',
  functionsVersion: null,
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
};
