'use client';

import { useEffect } from 'react';

export function FontProvider() {
  useEffect(() => {
    const apply = () => {
      const val = localStorage.getItem('fontFamily') || '';
      document.body.style.fontFamily = val && val !== 'system-default' ? val : '';
    };
    apply();
    window.addEventListener('client-config-changed', apply);
    window.addEventListener('storage', apply);
    return () => {
      window.removeEventListener('client-config-changed', apply);
      window.removeEventListener('storage', apply);
    };
  }, []);

  return null;
}
