import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-extrabold text-white">404</h1>
      <p className="mt-2 text-slate-400">Page not found.</p>
      <Link
        href="/"
        className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
