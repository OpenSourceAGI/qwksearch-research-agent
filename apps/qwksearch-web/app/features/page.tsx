import type { Metadata } from 'next';

import { FeaturesView } from '@/components/features/FeaturesView';
import { config } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Features - ${config.appName}`,
  description:
    'Search 100+ sites across 13 categories, extract and cite articles, PDFs, and YouTube transcripts, answer with any LLM provider, and write it up in the REASON editor.',
  alternates: { canonical: '/features' },
  openGraph: {
    title: `Features - ${config.appName}`,
    description:
      'Every capability of the QwkSearch research agent: multi-engine search, source extraction and citation, model choice, the REASON writing editor, and desktop, browser, and IDE apps.',
    url: `${config.baseUrl}/features`,
    type: 'website',
  },
};

const FeaturesPage = () => {
  return <FeaturesView />;
};

export default FeaturesPage;
