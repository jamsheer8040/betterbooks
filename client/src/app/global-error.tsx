'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-slate-400 text-sm">{error?.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
