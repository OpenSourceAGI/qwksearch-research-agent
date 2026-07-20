"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import SettingsContent from '@/components/Settings/SettingsContent';
import { Suspense } from 'react';

function SettingsInner() {
  const router = useRouter();
  const params = useParams<{ section?: string[] }>();
  const searchParams = useSearchParams();
  // Path form (/settings/models) wins; ?section= kept for old links
  const section =
    params.section?.[0] ?? searchParams.get('section') ?? undefined;

  return (
    <div className="h-screen w-screen flex flex-col bg-light-primary dark:bg-dark-primary overflow-hidden">
      <SettingsContent onClose={() => router.back()} initialSection={section} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
