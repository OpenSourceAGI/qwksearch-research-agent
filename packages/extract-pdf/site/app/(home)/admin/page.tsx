/**
 * @file page.tsx
 * @description `/admin`: sign in with the admin password and set the site's
 * global keys. The API is `worker/admin.ts`.
 */
import type { Metadata } from 'next';
import { AdminPanel } from '@/components/admin/AdminPanel';
import '@/components/demo/demo.css';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
