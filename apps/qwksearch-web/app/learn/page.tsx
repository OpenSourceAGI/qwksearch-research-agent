import type { Metadata } from 'next';

import { LearnView } from './LearnView';
import { config } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Learn - ${config.appName}`,
  description:
    'Self-paced education playlists of MIT OpenCourseWare lectures and courseware, sorted by category, major and program, with an AI planner that builds a custom playlist from a few follow-up questions.',
  alternates: { canonical: '/learn' },
  openGraph: {
    title: `Learn - ${config.appName}`,
    description:
      'Browse college-style study playlists, check items off at your own pace, and plan your own with AI.',
    url: `${config.baseUrl}/learn`,
    type: 'website',
  },
};

const LearnPage = () => {
  return <LearnView />;
};

export default LearnPage;
