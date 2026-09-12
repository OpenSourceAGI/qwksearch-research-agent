'use client';

import { useTranslation } from 'react-i18next';

import SettingHeader from '@/features/Settings/features/SettingHeader';

import ExtractionForm from './features/ExtractionForm';

interface PageProps {
  showSettingHeader?: boolean;
}

const Page = ({ showSettingHeader = true }: PageProps) => {
  const { t } = useTranslation('qwksearch');

  return (
    <>
      {showSettingHeader && (
        <SettingHeader description={t('extraction.description')} title={t('extraction.title')} />
      )}
      <ExtractionForm />
    </>
  );
};

export default Page;
